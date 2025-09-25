import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
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

const appointmentSchema = z.object({
  patientId: z.string().min(1, {
    message: "Veuillez sélectionner un patient.",
  }),
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

export function ExistingPatientAppointment() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [realAvailability, setRealAvailability] = useState<SpecificAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      services: [],
      notes: "",
    },
  });

  // Charger les patients
  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, phone, birth_date')
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Erreur chargement patients:', error);
        return;
      }

      setPatients(data || []);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
    }
  };

  // Charger les disponibilités
  const loadRealAvailability = async () => {
    try {
      // Charger les prochains 6 mois pour permettre les réservations à l'avance
      const currentDate = new Date();
      const startDate = format(currentDate, 'yyyy-MM-dd');
      const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 0), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('public_available_slots')
        .select('*')
        .gte('specific_date', startDate)
        .lte('specific_date', endDate)
        .order('specific_date', { ascending: true });

      if (error) {
        console.error('Erreur chargement disponibilités:', error);
        setRealAvailability([]);
        return;
      }

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
        timeSlots: timeSlots.sort()
      }));

      setRealAvailability(formattedAvailability);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
      setRealAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadPatients(), loadRealAvailability()]);
    };
    loadData();
  }, []);

  // Filtrer les patients selon le terme de recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm)
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  async function onSubmit(data: AppointmentFormValues) {
    try {
      // Vérifier que la date de rendez-vous est valide
      if (!data.date || isNaN(data.date.getTime())) {
        toast({
          title: "Erreur",
          description: "Date de rendez-vous invalide. Veuillez sélectionner une date valide.",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patientId,
          appointment_date: formatDateForDb(data.date),
          appointment_time: data.time,
          services: data.services as any,
          notes: data.notes || null,
        });

      if (error) {
        console.error('Erreur lors de la création du rendez-vous:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer le rendez-vous. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      const selectedPatient = patients.find(p => p.id === data.patientId);
      toast({
        title: "Rendez-vous créé",
        description: `Rendez-vous créé pour ${selectedPatient?.first_name} ${selectedPatient?.last_name} le ${format(data.date, "PPP", { locale: fr })} à ${data.time}`,
      });

      // Envoyer l'email de confirmation si l'email du patient est disponible
      if (selectedPatient?.email) {
        const [hh, mm] = (data.time || "00:00").split(":").map((n) => parseInt(n, 10));
        const start = new Date(data.date);
        start.setHours(hh || 0, mm || 0, 0, 0);
        const end = new Date(start.getTime() + 15 * 60 * 1000);

        const { error } = await supabase.functions.invoke("send-confirmation", {
          body: {
            to: selectedPatient.email,
            name: `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim(),
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            summary: "Rendez-vous Pharmacie Remili-Bastin",
            description: `Services: ${data.services.join(", ")}${data.notes ? `\nNotes: ${data.notes}` : ""}`,
            location: "Pharmacie Remili-Bastin, Rue Solvay 64, 7160 Chapelle-lez-Herlaimont",
            displayDate: format(data.date, "PPP", { locale: fr }),
            displayTime: data.time,
          },
        });

        if (error) {
          console.error("send-confirmation error", error);
          toast({
            title: "Email non envoyé",
            description: "Une erreur est survenue lors de l'envoi de l'email de confirmation.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Email envoyé",
            description: "Un email de confirmation avec fichier calendrier a été envoyé.",
          });
        }
      }

      form.reset();
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }

  const getAvailableTimeSlots = (selectedDate: Date | undefined) => {
    if (!selectedDate || !realAvailability) {
      return [];
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayAvailability = realAvailability.find(av => av.date === dateStr);
    
    return dayAvailability?.timeSlots || [];
  };

  const isDateAvailable = (date: Date) => {
    if (!realAvailability) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAvailability = realAvailability.find(av => av.date === dateStr);
    
    return dayAvailability && dayAvailability.timeSlots.length > 0;
  };

  const selectedDate = form.watch("date");
  const availableTimeSlots = getAvailableTimeSlots(selectedDate);

  const services = [
    { id: "covid", label: "Vaccin 2025-2026 contre le COVID" },
    { id: "grippe", label: "Vaccin contre la grippe 2025-2026" }
  ];

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
          <CardTitle>Prendre un Rendez-vous pour un Patient Existant</CardTitle>
          <CardDescription>
            Sélectionnez un patient existant et planifiez son rendez-vous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Recherche et sélection du patient */}
              <div className="space-y-4">
                <div>
                  <FormLabel>Rechercher un patient</FormLabel>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Nom, prénom, email ou téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-60 overflow-y-auto">
                          {filteredPatients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.first_name} {patient.last_name} 
                              {patient.email && ` - ${patient.email}`}
                              {patient.phone && ` - ${patient.phone}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date de rendez-vous */}
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
                            variant={"outline"}
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
                          disabled={(date) =>
                            date < new Date() || !isDateAvailable(date)
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Heure de rendez-vous */}
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

              {/* Services */}
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
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
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

              {/* Notes */}
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

              <Button type="submit" className="w-full">
                Créer le rendez-vous
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}