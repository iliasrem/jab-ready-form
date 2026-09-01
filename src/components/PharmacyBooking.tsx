import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Search, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";

import { cn, capitalizeName, formatDateForDb, formatTimeForDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
}

interface SpecificAvailability {
  date: string;
  timeSlots: string[];
}

const bookingSchema = z.object({
  date: z.date({ required_error: "Veuillez sélectionner une date de rendez-vous." }),
  time: z.string({ required_error: "Veuillez sélectionner une heure de rendez-vous." }),
  services: z
    .array(z.string())
    .min(1, { message: "Veuillez sélectionner au moins un service." })
    .max(2, { message: "Vous pouvez sélectionner maximum 2 services." }),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const services = [
  { id: "covid", label: "Vaccin 2026-2027 contre le COVID" },
  { id: "grippe", label: "Vaccin contre la grippe 2026-2027" },
];

// Convertit une saisie JJ/MM/AAAA (ou JJ-MM-AAAA) en YYYY-MM-DD, sinon null
const parseBirthDate = (value: string): string | null => {
  const m = value.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

export function PharmacyBooking() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [realAvailability, setRealAvailability] = useState<SpecificAvailability[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ [date: string]: string[] }>({});
  const [loading, setLoading] = useState(true);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { services: [], notes: "" },
  });

  const loadRealAvailability = async () => {
    try {
      const currentDate = new Date();
      const startDate = format(currentDate, "yyyy-MM-dd");
      const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 0), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("public_available_slots")
        .select("*")
        .gte("specific_date", startDate)
        .lte("specific_date", endDate)
        .order("specific_date", { ascending: true });

      if (error) {
        console.error("Erreur chargement disponibilités:", error);
        setRealAvailability([]);
        return;
      }

      const grouped: { [key: string]: string[] } = {};
      data?.forEach((item) => {
        if (!grouped[item.specific_date]) grouped[item.specific_date] = [];
        grouped[item.specific_date].push(formatTimeForDisplay(item.start_time));
      });

      setRealAvailability(
        Object.entries(grouped).map(([date, timeSlots]) => ({ date, timeSlots: timeSlots.sort() }))
      );
    } catch (error) {
      console.error("Erreur lors du chargement des disponibilités:", error);
      setRealAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSlots = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time")
      .eq("status", "pending");

    if (error) {
      console.error("Erreur lors de la récupération des créneaux réservés:", error);
      return;
    }

    const booked: { [date: string]: string[] } = {};
    data?.forEach((apt) => {
      if (!booked[apt.appointment_date]) booked[apt.appointment_date] = [];
      booked[apt.appointment_date].push(formatTimeForDisplay(apt.appointment_time));
    });
    setBookedSlots(booked);
  };

  useEffect(() => {
    loadRealAvailability();
    fetchBookedSlots();

    const channel = supabase
      .channel("pharmacy_booking_appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchBookedSlots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Recherche côté serveur (nom, prénom, date de naissance, téléphone)
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const birthDate = parseBirthDate(term);
        let query = supabase
          .from("patients")
          .select("id, first_name, last_name, email, phone, birth_date")
          .eq("status", "active")
          .order("last_name", { ascending: true })
          .limit(50);

        if (birthDate) {
          query = query.eq("birth_date", birthDate);
        } else {
          const digits = term.replace(/[\s\-.()]/g, "");
          const filters = [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
          ];
          if (/\d/.test(digits)) filters.push(`phone.ilike.%${digits}%`);
          query = query.or(filters.join(","));
        }

        const { data, error } = await query;
        if (error) {
          console.error("Erreur recherche patients:", error);
          setResults([]);
          return;
        }

        let list = data || [];

        // Recherche "nom prénom" en deux mots
        const words = term.split(/\s+/).filter(Boolean);
        if (!birthDate && words.length >= 2) {
          const { data: multi } = await supabase
            .from("patients")
            .select("id, first_name, last_name, email, phone, birth_date")
            .eq("status", "active")
            .ilike("last_name", `%${words[0]}%`)
            .ilike("first_name", `%${words[1]}%`)
            .limit(50);
          const { data: multiInv } = await supabase
            .from("patients")
            .select("id, first_name, last_name, email, phone, birth_date")
            .eq("status", "active")
            .ilike("first_name", `%${words[0]}%`)
            .ilike("last_name", `%${words[1]}%`)
            .limit(50);
          const merged = [...list, ...(multi || []), ...(multiInv || [])];
          list = Array.from(new Map(merged.map((p) => [p.id, p])).values());
        }

        list.sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr")
        );
        setResults(list);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getAvailableTimeSlots = (selectedDate: Date | undefined) => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayAvailability = realAvailability.find((av) => av.date === dateStr);
    const bookedTimes = bookedSlots[dateStr] || [];
    return (dayAvailability?.timeSlots || []).filter((slot) => !bookedTimes.includes(slot));
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayAvailability = realAvailability.find((av) => av.date === dateStr);
    return !!dayAvailability && dayAvailability.timeSlots.length > 0;
  };

  const selectedDate = form.watch("date");
  const availableTimeSlots = getAvailableTimeSlots(selectedDate);

  async function onSubmit(data: BookingFormValues) {
    if (!selectedPatient) {
      toast({
        title: "Aucun patient sélectionné",
        description: "Recherchez et sélectionnez d'abord un patient.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", formatDateForDb(data.date))
        .eq("appointment_time", data.time)
        .eq("status", "pending");

      if (checkError) {
        toast({
          title: "Erreur",
          description: "Impossible de vérifier la disponibilité du créneau.",
          variant: "destructive",
        });
        return;
      }

      if (existing && existing.length > 0) {
        toast({
          title: "Créneau déjà pris",
          description: "Veuillez choisir un autre horaire.",
          variant: "destructive",
        });
        return;
      }

      const { data: insertedAppt, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: selectedPatient.id,
          appointment_date: formatDateForDb(data.date),
          appointment_time: data.time,
          services: data.services as any,
          notes: data.notes || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Erreur création RDV:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer le rendez-vous.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Rendez-vous créé",
        description: `${capitalizeName(selectedPatient.first_name)} ${capitalizeName(
          selectedPatient.last_name
        )} — ${format(data.date, "PPP", { locale: fr })} à ${data.time}`,
      });

      await fetchBookedSlots();

      if (selectedPatient.email && insertedAppt?.id) {
        const { error: sendErr } = await supabase.functions.invoke("send-confirmation", {
          body: { appointment_id: insertedAppt.id },
        });
        if (sendErr) {
          console.error("send-confirmation error", sendErr);
        } else {
          toast({ title: "Email envoyé", description: "Confirmation envoyée au patient." });
        }
      }

      form.reset({ services: [], notes: "" });
      setSelectedPatient(null);
      setSearchTerm("");
      setResults([]);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>RDV via pharmacie</CardTitle>
          <CardDescription>
            Recherchez le patient (nom, prénom, date de naissance JJ/MM/AAAA ou téléphone) et créez son rendez-vous au comptoir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recherche patient */}
          <div className="space-y-3">
            <Label>Rechercher un patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Nom, prénom, 01/02/1950 ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border bg-primary/10 p-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">
                      {capitalizeName(selectedPatient.last_name)} {capitalizeName(selectedPatient.first_name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPatient.birth_date
                        ? format(new Date(selectedPatient.birth_date), "dd/MM/yyyy")
                        : "Date de naissance inconnue"}
                      {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}
                      {selectedPatient.email ? ` · ${selectedPatient.email}` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                  Changer
                </Button>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {searching && (
                  <p className="p-3 text-sm text-muted-foreground">Recherche en cours...</p>
                )}
                {!searching && searchTerm.trim().length < 2 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    Saisissez au moins 2 caractères pour lancer la recherche.
                  </p>
                )}
                {!searching && searchTerm.trim().length >= 2 && results.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Aucun patient trouvé.</p>
                )}
                {!searching &&
                  results.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => setSelectedPatient(patient)}
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/60"
                    >
                      <span className="font-medium">
                        {capitalizeName(patient.last_name)} {capitalizeName(patient.first_name)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.birth_date && (
                          <Badge variant="secondary" className="mr-2">
                            {format(new Date(patient.birth_date), "dd/MM/yyyy")}
                          </Badge>
                        )}
                        {patient.phone || patient.email || ""}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de rendez-vous</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisissez une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || !isDateAvailable(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de rendez-vous</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une heure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border shadow-md z-50 max-h-60 overflow-y-auto">
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="services"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Services</FormLabel>
                    </div>
                    {services.map((service) => (
                      <FormField
                        key={service.id}
                        control={form.control}
                        name="services"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service.id)}
                                onCheckedChange={(checked) =>
                                  checked
                                    ? field.onChange([...(field.value || []), service.id])
                                    : field.onChange(field.value?.filter((v) => v !== service.id))
                                }
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{service.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajoutez des notes sur ce rendez-vous..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={!selectedPatient}>
                Créer le rendez-vous
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
