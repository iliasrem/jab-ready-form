import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Save, X, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface SpecificDateAvailability {
  date: Date;
  enabled: boolean;
  timeSlots: { time: string; available: boolean; reserved?: boolean; }[];
}

const defaultTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"
];

interface AdvancedAvailabilityManagerProps {
  onAvailabilityChange: (availability: SpecificDateAvailability[]) => void;
  initialAvailability?: SpecificDateAvailability[];
}

export function AdvancedAvailabilityManager({ onAvailabilityChange, initialAvailability }: AdvancedAvailabilityManagerProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<string>("");
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);

  // Synchroniser avec une disponibilité initiale éventuelle
  useEffect(() => {
    if (initialAvailability) {
      setSpecificAvailability(initialAvailability);
    }
  }, [initialAvailability]);

  // Générer les disponibilités par défaut pour un jour
  const getDefaultDayAvailability = (date: Date): SpecificDateAvailability => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Dimanche = 0, Samedi = 6
    
    return {
      date,
      enabled: false, // Désactivé par défaut - l'utilisateur ouvrira les plages manuellement
      timeSlots: defaultTimeSlots.map(time => ({
        time,
        available: false // Tous les créneaux fermés par défaut
      }))
    };
  };

  // Obtenir la disponibilité pour une date spécifique
  const getAvailabilityForDate = (date: Date): SpecificDateAvailability => {
    const existing = specificAvailability.find(av => isSameDay(av.date, date));
    return existing || getDefaultDayAvailability(date);
  };

  // Mettre à jour la disponibilité pour une date
  const updateDateAvailability = (updatedAvailability: SpecificDateAvailability) => {
    const newAvailability = specificAvailability.filter(av => !isSameDay(av.date, updatedAvailability.date));
    newAvailability.push(updatedAvailability);
    setSpecificAvailability(newAvailability);
    onAvailabilityChange(newAvailability);
  };

  // Basculer l'activation d'un jour
  const toggleDay = (date: Date) => {
    const current = getAvailabilityForDate(date);
    const updated = { ...current, enabled: !current.enabled };
    updateDateAvailability(updated);
  };

  // Basculer un créneau horaire
  const toggleTimeSlot = (date: Date, timeIndex: number) => {
    const current = getAvailabilityForDate(date);
    const updatedTimeSlots = [...current.timeSlots];
    updatedTimeSlots[timeIndex].available = !updatedTimeSlots[timeIndex].available;
    
    const updated = { ...current, timeSlots: updatedTimeSlots };
    updateDateAvailability(updated);
  };

  // Sélectionner/désélectionner tous les créneaux d'un jour
  const toggleAllTimeSlotsForDay = (date: Date, enable: boolean) => {
    const current = getAvailabilityForDate(date);
    const updatedTimeSlots = current.timeSlots.map(slot => ({
      ...slot,
      available: enable
    }));
    
    const updated = { ...current, timeSlots: updatedTimeSlots };
    updateDateAvailability(updated);
  };

  // Appliquer un modèle à tout le mois
  const applyTemplateToMonth = () => {
    if (!selectedDate) return;
    
    const template = getAvailabilityForDate(selectedDate);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const newAvailabilities = allDaysInMonth.map(date => ({
      ...template,
      date: new Date(date),
      enabled: template.enabled && date.getDay() !== 0 && date.getDay() !== 6 // Garde les weekends fermés
    }));
    
    const updatedAvailability = [
      ...specificAvailability.filter(av => !allDaysInMonth.some(day => isSameDay(av.date, day))),
      ...newAvailabilities
    ];
    
    setSpecificAvailability(updatedAvailability);
    onAvailabilityChange(updatedAvailability);
    
    toast({
      title: "Modèle appliqué",
      description: `Les horaires du ${format(selectedDate, "d MMMM", { locale: fr })} ont été appliqués à tout le mois.`,
    });
  };

  // Appliquer un modèle à une plage de dates
  const applyTemplateToDateRange = () => {
    if (!selectedDate || !endDate) return;
    
    const template = getAvailabilityForDate(selectedDate);
    const endDateObj = new Date(endDate);
    
    if (isAfter(selectedDate, endDateObj)) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure à la date de début.",
        variant: "destructive"
      });
      return;
    }
    
    const allDaysInRange = eachDayOfInterval({ start: selectedDate, end: endDateObj });
    
    const newAvailabilities = allDaysInRange.map(date => ({
      ...template,
      date: new Date(date),
      enabled: template.enabled && date.getDay() !== 0 && date.getDay() !== 6 // Garde les weekends fermés
    }));
    
    const updatedAvailability = [
      ...specificAvailability.filter(av => !allDaysInRange.some(day => isSameDay(av.date, day))),
      ...newAvailabilities
    ];
    
    setSpecificAvailability(updatedAvailability);
    onAvailabilityChange(updatedAvailability);
    
    toast({
      title: "Modèle appliqué",
      description: `Les horaires du ${format(selectedDate, "d MMMM", { locale: fr })} ont été appliqués du ${format(selectedDate, "d MMMM", { locale: fr })} au ${format(endDateObj, "d MMMM yyyy", { locale: fr })}.`,
    });
  };

  // Obtenir les jours de la semaine sélectionnée
  const getWeekDays = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Commencer le lundi
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  };

  // Appliquer des disponibilités par défaut à une semaine
  const applyDefaultToWeek = (week: Date) => {
    const weekDays = getWeekDays(week);
    
    const newAvailabilities = weekDays.map(date => getDefaultDayAvailability(date));
    
    const updatedAvailability = [
      ...specificAvailability.filter(av => !weekDays.some(day => isSameDay(av.date, day))),
      ...newAvailabilities
    ];
    
    setSpecificAvailability(updatedAvailability);
    onAvailabilityChange(updatedAvailability);
    
    toast({
      title: "Semaine configurée",
      description: `Les disponibilités par défaut ont été appliquées à la semaine du ${format(weekDays[0], "d MMMM", { locale: fr })}.`,
    });
  };

  // Fermer complètement une semaine
  const closeWeek = (week: Date) => {
    const weekDays = getWeekDays(week);
    
    const newAvailabilities = weekDays.map(date => ({
      ...getAvailabilityForDate(date),
      date: new Date(date),
      enabled: false
    }));
    
    const updatedAvailability = [
      ...specificAvailability.filter(av => !weekDays.some(day => isSameDay(av.date, day))),
      ...newAvailabilities
    ];
    
    setSpecificAvailability(updatedAvailability);
    onAvailabilityChange(updatedAvailability);
    
    toast({
      title: "Semaine fermée",
      description: `La semaine du ${format(weekDays[0], "d MMMM", { locale: fr })} a été fermée.`,
    });
  };

  // Navigation entre les semaines
  const navigateWeek = (direction: "prev" | "next") => {
    if (!selectedWeek) return;
    const newWeek = direction === "next" 
      ? addDays(selectedWeek, 7) 
      : addDays(selectedWeek, -7);
    setSelectedWeek(newWeek);
  };

  const saveAvailabilityToSupabase = async () => {
    try {
      console.log('=== DÉBUT SAUVEGARDE ===');
      console.log('specificAvailability avant sauvegarde:', JSON.stringify(specificAvailability, null, 2));
      
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Utilisateur connecté:', user?.id);
      
      if (!user) {
        console.error('Pas d\'utilisateur connecté');
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour sauvegarder les disponibilités.",
          variant: "destructive"
        });
        return;
      }

      // Filtrer seulement les jours avec des créneaux disponibles
      const availableDays = specificAvailability.filter(day => {
        const hasAvailableSlots = day.enabled && day.timeSlots.some(slot => slot.available);
        console.log(`Jour ${format(day.date, 'yyyy-MM-dd')} - enabled: ${day.enabled}, créneaux disponibles: ${day.timeSlots.filter(s => s.available).length}`);
        return hasAvailableSlots;
      });

      console.log('Jours avec créneaux disponibles:', availableDays.length);
      console.log('Détail des jours disponibles:', availableDays.map(d => ({
        date: format(d.date, 'yyyy-MM-dd'),
        enabled: d.enabled,
        availableSlots: d.timeSlots.filter(s => s.available).map(s => s.time)
      })));

      // Convertir les disponibilités locales en format Supabase
      const supabaseAvailabilities = availableDays.flatMap(dayAvailability => 
        dayAvailability.timeSlots
          .filter(slot => slot.available) // Seulement les créneaux disponibles
          .map(slot => {
            const record = {
              user_id: user.id,
              specific_date: format(dayAvailability.date, 'yyyy-MM-dd'),
              start_time: slot.time,
              end_time: slot.time,
              is_available: true
            };
            console.log('Création enregistrement:', record);
            return record;
          })
      );
      
      console.log('Total créneaux à sauvegarder:', supabaseAvailabilities.length);

      // Supprimer les anciennes disponibilités pour ce mois et cet utilisateur
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      console.log('Suppression période:', monthStart, 'à', monthEnd);
      
      const { error: deleteError } = await supabase
        .from('specific_date_availability')
        .delete()
        .eq('user_id', user.id)
        .gte('specific_date', monthStart)
        .lte('specific_date', monthEnd);

      if (deleteError) {
        console.error('Erreur suppression:', deleteError);
        throw deleteError;
      }

      console.log('Suppression terminée');
      
      if (supabaseAvailabilities.length > 0) {
        console.log('Insertion des données...');
        const { error: insertError } = await supabase
          .from('specific_date_availability')
          .insert(supabaseAvailabilities);

        if (insertError) {
          console.error('Erreur d\'insertion:', insertError);
          throw insertError;
        }
        console.log('Insertion réussie');
      } else {
        console.log('Aucune donnée à insérer - aucun créneau disponible configuré');
      }

      console.log('=== SAUVEGARDE TERMINÉE ===');
      toast({
        title: "Sauvegarde réussie",
        description: `${supabaseAvailabilities.length} créneaux sauvegardés avec succès.`,
      });
    } catch (error) {
      console.error('=== ERREUR SAUVEGARDE ===', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive"
      });
    }
  };

  // Charger les disponibilités depuis Supabase
  const loadAvailabilityFromSupabase = async () => {
    try {
      console.log('=== CHARGEMENT DEPUIS SUPABASE ===');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      console.log('Chargement période:', monthStart, 'à', monthEnd);

      // Charger SEULEMENT les créneaux disponibles
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('specific_date_availability')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_available', true) // SEULEMENT les créneaux disponibles
        .gte('specific_date', monthStart)
        .lte('specific_date', monthEnd);

      if (availabilityError) throw availabilityError;

      // Charger les rendez-vous pour la même période
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .gte('appointment_date', monthStart)
        .lte('appointment_date', monthEnd)
        .neq('status', 'cancelled'); // Exclure les rendez-vous annulés

      if (appointmentsError) throw appointmentsError;

      console.log('Créneaux disponibles chargés:', availabilityData?.length || 0);
      console.log('Rendez-vous chargés:', appointmentsData?.length || 0);
      console.log('Détail des données de disponibilité:', availabilityData);
      console.log('Détail des rendez-vous:', appointmentsData);

      // Créer un set des créneaux réservés pour une recherche rapide
      const reservedSlots = new Set(
        appointmentsData?.map(apt => `${apt.appointment_date}_${apt.appointment_time.slice(0, 5)}`) || []
      );

      console.log('Créneaux réservés:', Array.from(reservedSlots));

       // Convertir les données Supabase en format local
       const groupedByDate = availabilityData?.reduce((acc, item) => {
         const dateKey = item.specific_date;
         if (!acc[dateKey]) {
           acc[dateKey] = [];
         }
         // Normaliser le format d'heure : "09:00:00" -> "09:00"
         const normalizedTime = item.start_time.slice(0, 5);
         const isReserved = reservedSlots.has(`${dateKey}_${normalizedTime}`);
         
         acc[dateKey].push({
           time: normalizedTime,
           available: true, // Tous les créneaux chargés sont disponibles
           reserved: isReserved // Marquer si le créneau est réservé
         });
         return acc;
       }, {} as Record<string, { time: string; available: boolean; reserved: boolean; }[]>);

      const loadedAvailabilities: SpecificDateAvailability[] = Object.entries(groupedByDate || {}).map(([dateStr, slots]) => {
        const date = new Date(dateStr);
        // Compléter avec tous les créneaux par défaut
        const allSlots = defaultTimeSlots.map(time => {
          const existingSlot = slots.find(s => s.time === time);
          return existingSlot || { time, available: false, reserved: false };
        });
        
        return {
          date,
          enabled: true, // Le jour est ouvert s'il a des créneaux disponibles
          timeSlots: allSlots
        };
      });

      console.log('Jours avec créneaux:', loadedAvailabilities.length);
      console.log('Détail des jours chargés:', loadedAvailabilities);
      
      // Si aucune disponibilité n'est configurée, créer des jours par défaut pour le mois actuel
      if (loadedAvailabilities.length === 0) {
        console.log('Aucune disponibilité trouvée, création des jours par défaut');
        const monthDays = eachDayOfInterval({
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth)
        });
        
        const defaultAvailabilities: SpecificDateAvailability[] = monthDays.map(date => ({
          date,
          enabled: false, // Par défaut, les jours sont fermés
          timeSlots: defaultTimeSlots.map(time => ({
            time,
            available: false,
            reserved: reservedSlots.has(`${format(date, 'yyyy-MM-dd')}_${time}`)
          }))
        }));
        
        setSpecificAvailability(defaultAvailabilities);
        onAvailabilityChange(defaultAvailabilities);
        
        toast({
          title: "Disponibilités par défaut créées",
          description: "Configurez vos créneaux disponibles pour ce mois.",
        });
      } else {
        setSpecificAvailability(loadedAvailabilities);
        onAvailabilityChange(loadedAvailabilities);

        const reservedCount = appointmentsData?.length || 0;
        toast({
          title: "Chargement réussi",
          description: `${loadedAvailabilities.length} jours avec créneaux chargés. ${reservedCount} créneaux réservés.`,
        });
      }
    } catch (error) {
      console.error('=== ERREUR CHARGEMENT ===', error);
      toast({
        title: "Erreur de chargement",
        description: "Une erreur est survenue lors du chargement.",
        variant: "destructive"
      });
    }
  };

  // Charger les disponibilités au changement de mois ET au montage du composant
  useEffect(() => {
    loadAvailabilityFromSupabase();
  }, [currentMonth]);

  // Recharger les données à chaque fois que le composant est monté
  useEffect(() => {
    loadAvailabilityFromSupabase();
  }, []);

  // Naviguer entre les mois
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  // Obtenir le statut d'un jour pour l'affichage du calendrier
  const getDayStatus = (date: Date) => {
    const availability = getAvailabilityForDate(date);
    if (!availability.enabled) return "closed";
    
    const availableSlots = availability.timeSlots.filter(slot => slot.available).length;
    const totalSlots = availability.timeSlots.length;
    
    if (availableSlots === 0) return "no-slots";
    if (availableSlots === totalSlots) return "fully-available";
    return "partially-available";
  };

  const selectedDayAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Gestion des Disponibilités Avancée</CardTitle>
              <CardDescription>
                Configurez vos disponibilités sur plusieurs mois. Sélectionnez une date pour gérer ses créneaux horaires.
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={saveAvailabilityToSupabase}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gestion par Semaine</CardTitle>
                <CardDescription>
                  Configurez rapidement les disponibilités pour une semaine entière
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {selectedWeek && (
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                         <div className="flex items-center space-x-3">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => navigateWeek("prev")}
                             className="flex items-center space-x-1"
                           >
                             <ChevronLeft className="h-4 w-4" />
                             <span>Précédente</span>
                           </Button>
                           
                           <div className="text-center">
                             <p className="font-medium">
                               Semaine du {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM", { locale: fr })} au {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })}
                             </p>
                             <p className="text-sm text-muted-foreground">
                               {getWeekDays(selectedWeek).filter(day => getAvailabilityForDate(day).enabled).length} jours ouverts sur 7
                             </p>
                           </div>

                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => navigateWeek("next")}
                             className="flex items-center space-x-1"
                           >
                             <span>Suivante</span>
                             <ChevronRight className="h-4 w-4" />
                           </Button>
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setSelectedWeek(new Date())}
                           >
                             Semaine actuelle
                           </Button>
                           
                           <Button
                             variant="default"
                             size="sm"
                             onClick={() => applyDefaultToWeek(selectedWeek)}
                           >
                             Horaires par défaut
                           </Button>
                           
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => closeWeek(selectedWeek)}
                           >
                             Fermer la semaine
                           </Button>
                           
                           <Button
                             variant="secondary"
                             size="sm"
                             onClick={() => {
                               const weeks = eachWeekOfInterval(
                                 { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
                                 { weekStartsOn: 1 }
                               );
                               weeks.forEach(week => {
                                 if (!isSameWeek(week, selectedWeek)) {
                                   const weekDays = getWeekDays(selectedWeek);
                                   const templateDays = getWeekDays(week);
                                   
                                   const newAvailabilities = templateDays.map((date, index) => {
                                     const templateDay = weekDays[index];
                                     const template = getAvailabilityForDate(templateDay);
                                     return {
                                       ...template,
                                       date: new Date(date)
                                     };
                                   });
                                   
                                   const updatedAvailability = [
                                     ...specificAvailability.filter(av => !templateDays.some(day => isSameDay(av.date, day))),
                                     ...newAvailabilities
                                   ];
                                   
                                   setSpecificAvailability(updatedAvailability);
                                   onAvailabilityChange(updatedAvailability);
                                 }
                               });
                               
                               toast({
                                 title: "Modèle appliqué",
                                 description: "Les horaires ont été appliqués à toutes les semaines du mois.",
                               });
                             }}
                           >
                             Appliquer au mois
                           </Button>
                         </div>
                       </div>

                      <div className="grid grid-cols-7 gap-2">
                        {getWeekDays(selectedWeek).map((day) => {
                          const dayAvailability = getAvailabilityForDate(day);
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const availableSlots = dayAvailability.timeSlots.filter(slot => slot.available).length;
                          
                          return (
                            <div
                              key={day.toISOString()}
                              className={`p-2 rounded-lg border text-center transition-colors ${
                                isSelected 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="text-xs font-medium">
                                {format(day, "EEE", { locale: fr })}
                              </div>
                              <div className="text-sm font-bold mb-2">
                                {format(day, "d", { locale: fr })}
                              </div>
                              
                              {/* Checkbox pour activer/désactiver le jour */}
                              <div className="flex items-center justify-center mb-2">
                                <Checkbox
                                  checked={dayAvailability.enabled}
                                  onCheckedChange={() => toggleDay(day)}
                                />
                              </div>
                              
                              {dayAvailability.enabled && (
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {availableSlots}/{dayAvailability.timeSlots.length}
                                  </div>
                                  
                                  {/* Affichage de tous les créneaux de 15 minutes verticalement */}
                                  <div className="space-y-1">
                                    {dayAvailability.timeSlots.map((slot, slotIndex) => {
                                      let buttonVariant: "default" | "outline" | "destructive" | "secondary" = "outline";
                                      let buttonClass = "text-xs h-6 w-full";
                                      let isDisabled = false;
                                      
                                      // Debug pour vérifier les données des créneaux
                                      console.log(`Créneau ${slot.time} - available: ${slot.available}, reserved: ${slot.reserved}`);
                                      
                                      if (slot.reserved) {
                                        buttonVariant = "destructive";
                                        buttonClass += " opacity-75";
                                        isDisabled = true;
                                      } else if (slot.available) {
                                        buttonVariant = "default";
                                      }
                                      
                                      return (
                                        <Button
                                          key={slot.time}
                                          variant={buttonVariant}
                                          size="sm"
                                          className={buttonClass}
                                          onClick={() => !isDisabled && toggleTimeSlot(day, slotIndex)}
                                          disabled={isDisabled}
                                          title={slot.reserved ? "Créneau réservé" : (slot.available ? "Créneau disponible" : "Créneau fermé")}
                                        >
                                          {slot.time}
                                          {slot.reserved && <span className="ml-1 text-xs">📅</span>}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Boutons pour sélectionner/désélectionner tous les créneaux du jour */}
                                  <div className="flex gap-1 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 flex-1"
                                      onClick={() => toggleAllTimeSlotsForDay(day, true)}
                                    >
                                      Tout
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 flex-1"
                                      onClick={() => toggleAllTimeSlotsForDay(day, false)}
                                    >
                                      Rien
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {!dayAvailability.enabled && (
                                <div className="text-xs text-muted-foreground">
                                  Fermé
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                   )}
                 </CardContent>
               </Card>
             </div>
         </CardContent>
       </Card>
     </div>
   );
 }