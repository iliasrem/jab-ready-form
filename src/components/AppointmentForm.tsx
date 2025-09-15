import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
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

interface SpecificAvailability {
  date: string; // Format YYYY-MM-DD
  timeSlots: string[]; // Array of available times like ["09:00", "09:15"]
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
  email: z.string().email({
    message: "Veuillez entrer une adresse e-mail valide.",
  }).optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDay: z.string({
    required_error: "Veuillez sélectionner le jour de naissance.",
  }),
  birthMonth: z.string({
    required_error: "Veuillez sélectionner le mois de naissance.",
  }),
  birthYear: z.string({
    required_error: "Veuillez sélectionner l'année de naissance.",
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

export function AppointmentForm({ availability }: AppointmentFormProps) {
  const { toast } = useToast();
  const [realAvailability, setRealAvailability] = useState<SpecificAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDay: "",
      birthMonth: "",
      birthYear: "",
      services: [],
      notes: "",
    },
  });

  // Charger les vraies disponibilités depuis Supabase
  const loadRealAvailability = async () => {
    try {
      setLoading(true);
      console.log('=== CHARGEMENT DISPONIBILITÉS FORM ===');
      
      // Charger les prochains 3 mois
      const currentDate = new Date();
      const startDate = format(currentDate, 'yyyy-MM-dd');
      const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0), 'yyyy-MM-dd');
      
      console.log('Période form:', startDate, 'à', endDate);

      const { data, error } = await supabase
        .from('specific_date_availability')
        .select('*')
        .eq('is_available', true)
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
        groupedAvailability[item.specific_date].push(item.start_time);
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
  }, []);

  async function onSubmit(data: AppointmentFormValues) {
    try {
      // 1. Créer le patient
      // Normaliser les champs optionnels pour satisfaire les politiques RLS
      const emailTrim = (data.email ?? "").trim();
      const normalizedEmail = emailTrim.length ? emailTrim : null;

      const phoneTrim = (data.phone ?? "").trim();
      const normalizedPhone = phoneTrim && phoneTrim !== phonePrefix.trim() ? phoneTrim : null;

      const notesTrim = (data.notes ?? "").trim();
      const normalizedNotes = notesTrim.length ? notesTrim : null;

      const newPatientId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // Créer la date de naissance à partir des champs séparés
      const birthDate = new Date(parseInt(data.birthYear), parseInt(data.birthMonth) - 1, parseInt(data.birthDay));

      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: newPatientId,
          first_name: data.firstName,
          last_name: data.lastName,
          email: normalizedEmail,
          phone: normalizedPhone,
          birth_date: birthDate.toISOString().split('T')[0],
          notes: normalizedNotes,
        });

      if (patientError) {
        console.error('Erreur lors de la création du patient:', patientError);
        console.log('Données patient envoyées:', {
          first_name: data.firstName,
          last_name: data.lastName,
          email: normalizedEmail,
          phone: normalizedPhone,
          notes: normalizedNotes,
        });
        toast({
          title: "Erreur",
          description: `Impossible de créer le patient: ${patientError.message}`,
          variant: "destructive",
        });
        return;
      }

      // 2. Créer le rendez-vous
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: newPatientId,
          appointment_date: data.date.toISOString().split('T')[0],
          appointment_time: data.time,
          services: data.services as any, // Force type conversion
          notes: data.notes || null,
        });

      if (appointmentError) {
        console.error('Erreur lors de la création du rendez-vous:', appointmentError);
        toast({
          title: "Erreur",
          description: "Impossible de créer le rendez-vous. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // 3. Afficher le message de succès
      toast({
        title: "Rendez-vous créé",
        description: `Merci ${data.firstName} ${data.lastName} ! Votre rendez-vous pour le ${format(data.date, "PPP", { locale: fr })} à ${data.time} a été créé. Services: ${data.services.join(", ")}`,
      });

      // 4. Envoyer l'email de confirmation si l'email est fourni
      if (data.email && data.email.includes("@")) {
        const [hh, mm] = (data.time || "00:00").split(":").map((n) => parseInt(n, 10));
        const start = new Date(data.date);
        start.setHours(hh || 0, mm || 0, 0, 0);
        const end = new Date(start.getTime() + 15 * 60 * 1000);

        const { error } = await supabase.functions.invoke("send-confirmation", {
          body: {
            to: data.email,
            name: `${data.firstName} ${data.lastName}`.trim(),
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
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email de confirmation.",
        variant: "destructive",
      });
    } finally {
      form.reset();
    }
  }

  // Get available time slots based on selected date
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
  const [phonePrefix, setPhonePrefix] = useState<string>("+32 ");

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
  const countryOptions = [
    { code: "BE", label: "Belgique (+32)", prefix: "+32 " },
    { code: "AL", label: "Albanie (+355)", prefix: "+355 " },
    { code: "AD", label: "Andorre (+376)", prefix: "+376 " },
    { code: "AT", label: "Autriche (+43)", prefix: "+43 " },
    { code: "BA", label: "Bosnie-Herzégovine (+387)", prefix: "+387 " },
    { code: "BG", label: "Bulgarie (+359)", prefix: "+359 " },
    { code: "HR", label: "Croatie (+385)", prefix: "+385 " },
    { code: "CY", label: "Chypre (+357)", prefix: "+357 " },
    { code: "CZ", label: "Tchéquie (+420)", prefix: "+420 " },
    { code: "DK", label: "Danemark (+45)", prefix: "+45 " },
    { code: "EE", label: "Estonie (+372)", prefix: "+372 " },
    { code: "FI", label: "Finlande (+358)", prefix: "+358 " },
    { code: "FR", label: "France (+33)", prefix: "+33 " },
    { code: "DE", label: "Allemagne (+49)", prefix: "+49 " },
    { code: "GR", label: "Grèce (+30)", prefix: "+30 " },
    { code: "HU", label: "Hongrie (+36)", prefix: "+36 " },
    { code: "IS", label: "Islande (+354)", prefix: "+354 " },
    { code: "IE", label: "Irlande (+353)", prefix: "+353 " },
    { code: "IT", label: "Italie (+39)", prefix: "+39 " },
    { code: "LV", label: "Lettonie (+371)", prefix: "+371 " },
    { code: "LI", label: "Liechtenstein (+423)", prefix: "+423 " },
    { code: "LT", label: "Lituanie (+370)", prefix: "+370 " },
    { code: "LU", label: "Luxembourg (+352)", prefix: "+352 " },
    { code: "MT", label: "Malte (+356)", prefix: "+356 " },
    { code: "MD", label: "Moldavie (+373)", prefix: "+373 " },
    { code: "MC", label: "Monaco (+377)", prefix: "+377 " },
    { code: "ME", label: "Monténégro (+382)", prefix: "+382 " },
    { code: "NL", label: "Pays-Bas (+31)", prefix: "+31 " },
    { code: "MK", label: "Macédoine du Nord (+389)", prefix: "+389 " },
    { code: "NO", label: "Norvège (+47)", prefix: "+47 " },
    { code: "PL", label: "Pologne (+48)", prefix: "+48 " },
    { code: "PT", label: "Portugal (+351)", prefix: "+351 " },
    { code: "RO", label: "Roumanie (+40)", prefix: "+40 " },
    { code: "SM", label: "Saint-Marin (+378)", prefix: "+378 " },
    { code: "RS", label: "Serbie (+381)", prefix: "+381 " },
    { code: "SK", label: "Slovaquie (+421)", prefix: "+421 " },
    { code: "SI", label: "Slovénie (+386)", prefix: "+386 " },
    { code: "ES", label: "Espagne (+34)", prefix: "+34 " },
    { code: "SE", label: "Suède (+46)", prefix: "+46 " },
    { code: "CH", label: "Suisse (+41)", prefix: "+41 " },
    { code: "TR", label: "Turquie (+90)", prefix: "+90 " },
    { code: "UA", label: "Ukraine (+380)", prefix: "+380 " },
    { code: "GB", label: "Royaume-Uni (+44)", prefix: "+44 " },
    { code: "VA", label: "Vatican (+379)", prefix: "+379 " },
    { code: "GI", label: "Gibraltar (+350)", prefix: "+350 " },
    { code: "FO", label: "Îles Féroé (+298)", prefix: "+298 " },
    { code: "XK", label: "Kosovo (+383)", prefix: "+383 " },
    { code: "BY", label: "Biélorussie (+375)", prefix: "+375 " },
    { code: "AM", label: "Arménie (+374)", prefix: "+374 " },
    { code: "AZ", label: "Azerbaïdjan (+994)", prefix: "+994 " },
    { code: "GE", label: "Géorgie (+995)", prefix: "+995 " },
  ];
  const services = [
    { id: "covid", label: "Vaccin 2025-2026 contre le COVID" },
    { id: "grippe", label: "Vaccin contre la grippe 2025-2026" }
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

            <div>
              <FormLabel className="text-sm font-medium">Date de naissance</FormLabel>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <FormField
                  control={form.control}
                  name="birthDay"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Jour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-60 overflow-y-auto">
                          {Array.from({ length: 31 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}
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
                  name="birthMonth"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Mois" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-60 overflow-y-auto">
                          {[
                            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
                          ].map((month, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {month}
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
                  name="birthYear"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Année" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-60 overflow-y-auto">
                          {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-muted-foreground">(optionnel)</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Entrez votre e-mail" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone <span className="text-muted-foreground">(optionnel)</span></FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(val) => {
                            const newPrefix = val;
                            const current = field.value ?? "";
                            const rest = current.startsWith(phonePrefix)
                              ? current.slice(phonePrefix.length)
                              : current.replace(/^[+\d\s]*/, "");
                            const next = newPrefix + rest.replace(/[^\d\s]/g, "");
                            setPhonePrefix(newPrefix);
                            field.onChange(next);
                          }}
                          defaultValue={phonePrefix}
                          value={phonePrefix}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Indicatif" />
                          </SelectTrigger>
                          <SelectContent>
                            {countryOptions.map((opt) => (
                              <SelectItem key={opt.code} value={opt.prefix}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="4xx xx xx xx"
                          {...field}
                          value={field.value ?? ""}
                          onFocus={(e) => {
                            if (!field.value || !field.value.startsWith(phonePrefix)) {
                              field.onChange(phonePrefix);
                              requestAnimationFrame(() => {
                                const el = e.target as HTMLInputElement;
                                el.setSelectionRange(el.value.length, el.value.length);
                              });
                            }
                          }}
                          onChange={(e) => {
                            const el = e.target as HTMLInputElement;
                            let v = el.value || "";
                            if (!v.startsWith(phonePrefix)) {
                              v = v.replace(/^\+?\d*\s*/, "");
                              v = phonePrefix + v;
                            }
                            v = phonePrefix + v.slice(phonePrefix.length).replace(/[^\d\s]/g, "");
                            field.onChange(v);
                          }}
                          onKeyDown={(e) => {
                            const el = e.currentTarget as HTMLInputElement;
                            const prefixLen = phonePrefix.length;
                            if (
                              (e.key === "Backspace" && el.selectionStart !== null && el.selectionStart <= prefixLen) ||
                              (e.key === "Delete" && el.selectionStart !== null && el.selectionStart < prefixLen)
                            ) {
                              e.preventDefault();
                              if (!el.value.startsWith(phonePrefix)) {
                                field.onChange(phonePrefix);
                              }
                            }
                          }}
                        />
                      </div>
                    </FormControl>
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
                          disabled={(date) =>
                            date < new Date() || 
                            date < new Date("1900-01-01") ||
                            !isDateAvailable(date)
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

            <Button type="submit" className="w-full">
              Réserver le rendez-vous
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}