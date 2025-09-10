import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";

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
import { useState } from "react";
import { DayAvailability } from "./AvailabilityManager";

interface AppointmentFormProps {
  availability?: DayAvailability[];
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
  birthDate: z.date({
    required_error: "Veuillez sélectionner votre date de naissance.",
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
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      services: [],
      notes: "",
    },
  });

  async function onSubmit(data: AppointmentFormValues) {
    try {
      // First, create the patient record
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          birth_date: data.birthDate.toISOString().split('T')[0],
          notes: data.notes || null,
        })
        .select()
        .single();

      if (patientError) {
        console.error('Error creating patient:', patientError);
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer vos informations. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Then, create the appointment record
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientData.id,
          appointment_date: data.date.toISOString().split('T')[0],
          appointment_time: data.time,
          services: data.services as ("covid" | "grippe")[],
          notes: data.notes || null,
        });

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError);
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer votre rendez-vous. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Show success message
      toast({
        title: "Rendez-vous confirmé !",
        description: `Merci ${data.firstName} ${data.lastName} ! Votre rendez-vous pour le ${format(data.date, "PPP", { locale: require("date-fns/locale/fr") })} à ${data.time} a été enregistré. Services: ${data.services.join(", ")}`,
      });
    } catch (e) {
      console.error('General error:', e);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre rendez-vous. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      form.reset();
    }
  }

  // Get available time slots based on selected date
  const getAvailableTimeSlots = (selectedDate: Date | undefined) => {
    if (!selectedDate || !availability) {
      return []; // No slots available if no date selected or no availability configured
    }
    
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = availability.find(day => day.day === dayName);
    
    if (!dayAvailability || !dayAvailability.enabled) {
      return []; // Day not available
    }
    
    return dayAvailability.timeSlots
      .filter(slot => slot.available)
      .map(slot => slot.time);
  };

  const isDateAvailable = (date: Date) => {
    if (!availability) return false;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = availability.find(day => day.day === dayName);
    
    return dayAvailability?.enabled && 
           dayAvailability.timeSlots.some(slot => slot.available);
  };

  const selectedDate = form.watch("date");
  const availableTimeSlots = getAvailableTimeSlots(selectedDate);

  const [phonePrefix, setPhonePrefix] = useState<string>("+32 ");
  const [birthDateInput, setBirthDateInput] = useState<string>("");
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
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="JJ/MM/AAAA"
                      value={birthDateInput}
                      onChange={(e) => {
                        console.log("Input onChange:", e.target.value); // Debug log
                        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        
                        // Add slashes automatically
                        if (value.length >= 2) {
                          value = value.substring(0, 2) + '/' + value.substring(2);
                        }
                        if (value.length >= 5) {
                          value = value.substring(0, 5) + '/' + value.substring(5, 9);
                        }
                        
                        setBirthDateInput(value);
                        
                        // Parse and set the date if complete
                        if (value.length === 10) {
                          const [day, month, year] = value.split('/');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          
                          // Validate the date
                          if (date.getDate() == parseInt(day) && 
                              date.getMonth() == parseInt(month) - 1 && 
                              date.getFullYear() == parseInt(year)) {
                            field.onChange(date);
                            console.log("Date set:", date); // Debug log
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                      onKeyDown={(e) => {
                        console.log("Key pressed:", e.key); // Debug log
                        // Allow backspace, delete, tab, escape, enter, arrows
                        if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(e.keyCode) ||
                            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                            (e.keyCode === 65 && e.ctrlKey) ||
                            (e.keyCode === 67 && e.ctrlKey) ||
                            (e.keyCode === 86 && e.ctrlKey) ||
                            (e.keyCode === 88 && e.ctrlKey)) {
                          return;
                        }
                        // Ensure that it is a number and stop the keypress
                        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                          e.preventDefault();
                        }
                      }}
                      maxLength={10}
                    />
                  </FormControl>
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
                              format(field.value, "PPP")
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
                  <FormItem>
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