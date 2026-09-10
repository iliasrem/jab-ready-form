import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";

import { cn, formatDateForDb, formatTimeForDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { AppointmentConfirmationDialog } from "@/components/AppointmentConfirmationDialog";

interface SpecificAvailability {
  date: string; // Format YYYY-MM-DD
  timeSlots: string[]; // Array of available times like ["09:00", "09:15"]
}

// Formate une saisie de date en JJ/MM/AAAA
function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

// Convertit une date saisie au format JJ/MM/AAAA en YYYY-MM-DD
function parseDateInput(value: string): string | null {
  if (!value) return null;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Normalise un numéro saisi librement vers le format international +XXXXXXXXXX
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    if (s.startsWith("0")) s = "+32" + s.slice(1);
    else if (s.startsWith("32")) s = "+" + s;
    else s = "+32" + s;
  }
  const digits = s.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return "+" + digits;
}

interface AppointmentFormProps {
  availability?: any[]; // Keeping for backward compatibility but not used
}

const appointmentSchema = z.object({
  firstName: z.string().min(2, {
    message: "Le prénom doit contenir au moins 2 caractères.",
  }),
  lastName: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères.",
  }),
  phone: z
    .string()
    .min(1, { message: "Le numéro de téléphone est obligatoire." })
    .refine((val) => normalizePhoneNumber(val) !== null, {
      message: "Numéro de téléphone invalide. Ex. 0471 12 34 56 ou +33 6 12 34 56 78.",
    }),
  birthDate: z
    .string()
    .refine((val) => !val || /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
      message: "Format incorrect. Veuillez utiliser JJ/MM/AAAA (ex. 15/09/1985).",
    })
    .refine((val) => {
      if (!val) return true;
      const [day, month, year] = val.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    }, { message: "Cette date de naissance n'est pas valide." })
    .optional(),
  date: z.date({
    required_error: "Veuillez sélectionner une date de rendez-vous.",
  }),
  time: z.string({
    required_error: "Veuillez sélectionner une heure de rendez-vous.",
  }),
  services: z.array(z.string()).min(1, {
    message: "Veuillez sélectionner au moins un service.",
  }).max(2, {
    message: "Vous pouvez sélectionner maximum 2 services.",
  }),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export function AppointmentForm({ availability }: AppointmentFormProps) {
  const { toast } = useToast();
  const [realAvailability, setRealAvailability] = useState<SpecificAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<{ [date: string]: string[] }>({});
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<{
    data: AppointmentFormValues;
    normalizedPhone: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    date: Date;
    time: string;
    services: string[];
    notes?: string;
  } | null>(null);
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      services: [],
      notes: "",
    },
  });

  // Charger les vraies disponibilités depuis Supabase
  const loadRealAvailability = async () => {
    try {
      setLoading(true);
      console.log('=== CHARGEMENT DISPONIBILITÉS FORM ===');
      
      // Charger les prochains 6 mois pour permettre les réservations à l'avance
      const currentDate = new Date();
      const startDate = format(currentDate, 'yyyy-MM-dd');
      const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 0), 'yyyy-MM-dd');
      
      console.log('Période form (6 mois):', startDate, 'à', endDate);

      const { data, error } = await supabase
        .from('public_available_slots')
        .select('*')
        .gte('specific_date', startDate)
        .lte('specific_date', endDate)
        .order('specific_date', { ascending: true });

      if (error) {
        console.error('Erreur chargement form:', error);
        setRealAvailability([]);
        return;
      }

      console.log('Données disponibilités form:', data?.length || 0);

      // Grouper par date
      const groupedAvailability: { [key: string]: string[] } = {};
      data?.forEach(item => {
        if (!groupedAvailability[item.specific_date]) {
          groupedAvailability[item.specific_date] = [];
        }
        groupedAvailability[item.specific_date].push(formatTimeForDisplay(item.start_time));
      });

      // Convertir en format final
      const formattedAvailability = Object.entries(groupedAvailability).map(([date, timeSlots]) => ({
        date,
        timeSlots: timeSlots.sort() // Trier les créneaux
      }));

      console.log('Disponibilités formatées form:', formattedAvailability);
      setRealAvailability(formattedAvailability);
      
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités form:', error);
      setRealAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealAvailability();
    fetchBookedSlots();

    // Écouter les changements de rendez-vous en temps réel
    const channel = supabase
      .channel('appointments_booking_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchBookedSlots(); // Recharger les créneaux réservés
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function onSubmit(data: AppointmentFormValues) {
    if (submitting) return;
    if (!data.date || isNaN(data.date.getTime())) {
      toast({
        title: "Erreur",
        description: "Date de rendez-vous invalide.",
        variant: "destructive",
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(data.phone);
    if (!normalizedPhone) {
      form.setError("phone", {
        message: "Numéro de téléphone invalide. Ex. 0471 12 34 56 ou +33 6 12 34 56 78.",
      });
      return;
    }

    // Demander la confirmation du numéro au format international
    setPendingBooking({ data, normalizedPhone });
    setShowPhoneDialog(true);
  }

  async function submitBooking(data: AppointmentFormValues, normalizedPhone: string) {
    setSubmitting(true);
    try {
      const notesTrim = (data.notes ?? "").trim();
      const normalizedNotes = notesTrim.length ? notesTrim : null;

      const { data: result, error } = await supabase.functions.invoke("create-booking", {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: normalizedPhone,
          birthDate: data.birthDate ? parseDateInput(data.birthDate) : null,
          appointmentDate: formatDateForDb(data.date),
          appointmentTime: data.time,
          services: data.services,
          notes: normalizedNotes,
        },
      });

      if (error || (result && (result as any).error)) {
        const msg =
          (result as any)?.error ||
          error?.message ||
          "Impossible de créer le rendez-vous.";
        console.error("create-booking failed:", error, result);
        toast({
          title: "Erreur",
          description: typeof msg === "string" ? msg : "Erreur lors de la réservation.",
          variant: "destructive",
        });
        return;
      }

      setConfirmationData({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: normalizedPhone,
        date: data.date,
        time: data.time,
        services: data.services,
        notes: normalizedNotes || undefined,
      });
      setShowConfirmationDialog(true);

      await fetchBookedSlots();
      form.reset();
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }


  // Fonction pour récupérer les créneaux déjà réservés
  // Via la vue publique qui n'expose QUE date + heure (aucune donnée patient)
  const fetchBookedSlots = async () => {
    try {
      const { data: appointments, error } = await supabase
        .from('public_booked_slots')
        .select('appointment_date, appointment_time');

      if (error) {
        console.error('Erreur lors de la récupération des créneaux réservés:', error);
        return;
      }

      const booked: { [date: string]: string[] } = {};
      appointments?.forEach((apt) => {
        const dateStr = apt.appointment_date;
        const timeStr = formatTimeForDisplay(apt.appointment_time);
        
        if (!booked[dateStr]) {
          booked[dateStr] = [];
        }
        booked[dateStr].push(timeStr);
      });

      setBookedSlots(booked);
    } catch (error) {
      console.error('Erreur lors de la récupération des créneaux réservés:', error);
    }
  };

  // Get available time slots based on selected date
  const getAvailableTimeSlots = (selectedDate: Date | undefined) => {
    if (!selectedDate || !realAvailability) {
      return [];
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayAvailability = realAvailability.find(av => av.date === dateStr);
    const bookedTimes = bookedSlots[dateStr] || [];
    
    // Filtrer les créneaux disponibles en excluant ceux déjà réservés
    const availableSlots = dayAvailability?.timeSlots || [];
    return availableSlots.filter(timeSlot => !bookedTimes.includes(timeSlot));
  };

  const isDateAvailable = (date: Date) => {
    if (!realAvailability) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAvailability = realAvailability.find(av => av.date === dateStr);
    
    return dayAvailability && dayAvailability.timeSlots.length > 0;
  };

  const selectedDate = form.watch("date");
  const availableTimeSlots = getAvailableTimeSlots(selectedDate);
  

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des disponibilités...</p>
        </CardContent>
      </Card>
    );
  }
  const services = [
    { id: "covid", label: "Vaccin 2026-2027 contre le COVID" },
    { id: "grippe", label: "Vaccin contre la grippe 2026-2027" }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Réserver un Rendez-vous</CardTitle>
        <CardDescription>
          Remplissez le formulaire ci-dessous pour planifier votre rendez-vous avec nous.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrez votre nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrez votre prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de naissance (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="JJ/MM/AAAA"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          field.onChange(formatted || undefined);
                        }}
                        maxLength={10}
                      />
                    </FormControl>
                    <FormDescription>
                      Optionnel : aide à vous retrouver dans notre fichier patient.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Numéro de téléphone *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="0471 12 34 56 ou +33 6 12 34 56 78"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Saisissez votre numéro comme vous voulez (fixe, mobile ou étranger) : nous
                      le convertirons au format international.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>


            <FormField
              control={form.control}
              name="services"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Services</FormLabel>
                    <FormDescription>
                      Sélectionnez 1 ou 2 services pour votre rendez-vous.
                    </FormDescription>
                  </div>
                  {services.map((service) => (
                    <FormField
                      key={service.id}
                      control={form.control}
                      name="services"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={service.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, service.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== service.id
                                        )
                                      )
                                }}
                                disabled={!field.value?.includes(service.id) && field.value?.length >= 2}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {service.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date du rendez-vous</FormLabel>
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
                                <span>Choisir une date</span>
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
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today || 
                                   date < new Date("1900-01-01") ||
                                   !isDateAvailable(date);
                          }}
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Heure préférée</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une heure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-muted-foreground">
                            {selectedDate ? "Aucun créneau disponible pour cette date" : "Veuillez d'abord sélectionner une date"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes supplémentaires</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Toute information supplémentaire ou demande spéciale..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optionnel : Incluez toute exigence spécifique ou note pour votre rendez-vous.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Envoi en cours..." : "Réserver le rendez-vous"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <AlertDialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmez votre numéro de téléphone</AlertDialogTitle>
            <AlertDialogDescription>
              Nous avons converti votre numéro au format international. Est-il correct ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-center text-2xl font-semibold tracking-wide py-2">
            {pendingBooking?.normalizedPhone}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Modifier</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingBooking) return;
                const { data, normalizedPhone } = pendingBooking;
                form.setValue("phone", normalizedPhone);
                setShowPhoneDialog(false);
                setPendingBooking(null);
                void submitBooking(data, normalizedPhone);
              }}
            >
              Confirmer et réserver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {confirmationData && (
        <AppointmentConfirmationDialog
          open={showConfirmationDialog}
          onOpenChange={setShowConfirmationDialog}
          appointmentData={confirmationData}
        />
      )}
    </Card>
  );
}