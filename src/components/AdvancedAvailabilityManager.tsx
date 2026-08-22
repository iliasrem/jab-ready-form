import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTimeForDisplay } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface SpecificDateAvailability {
  date: Date;
  blocked?: boolean;
  blockActivity?: string;
  timeSlots: { time: string; available: boolean; reserved?: boolean; }[];
}

const defaultTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"
];

const saturdayTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45"
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
    const isSaturday = date.getDay() === 6;
    const slots = isSaturday ? saturdayTimeSlots : defaultTimeSlots;
    
    return {
      date,
      timeSlots: slots.map(time => ({
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

  // Vérifier si un jour a des créneaux disponibles
  const hasAvailableSlots = (date: Date): boolean => {
    const current = getAvailabilityForDate(date);
    return current.timeSlots.some(slot => slot.available);
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
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(day => day.getDay() !== 0); // Exclure les dimanches
    
    const newAvailabilities = allDaysInMonth.map(date => ({
      ...template,
      date: new Date(date)
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
    
    const allDaysInRange = eachDayOfInterval({ start: selectedDate, end: endDateObj }).filter(day => day.getDay() !== 0); // Exclure les dimanches
    
    const newAvailabilities = allDaysInRange.map(date => ({
      ...template,
      date: new Date(date)
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
    const weekDays = getWeekDays(week).filter(day => day.getDay() !== 0); // Exclure les dimanches
    
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

  // Fermer complètement une semaine - fermer tous les créneaux
  const closeWeek = (week: Date) => {
    const weekDays = getWeekDays(week).filter(day => day.getDay() !== 0); // Exclure les dimanches
    
    const newAvailabilities = weekDays.map(date => ({
      ...getAvailabilityForDate(date),
      date: new Date(date),
      timeSlots: getAvailabilityForDate(date).timeSlots.map(slot => ({
        ...slot,
        available: false
      }))
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
    // Mettre à jour currentMonth pour que le calendrier suive
    setCurrentMonth(newWeek);
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

      // Convertir TOUS les créneaux configurés (disponibles ET non disponibles)
      // Respecter directement la valeur available du slot, sans dépendre de enabled
      const supabaseAvailabilities = specificAvailability.flatMap(dayAvailability => 
        dayAvailability.timeSlots.map(slot => ({
          user_id: user.id,
          specific_date: format(dayAvailability.date, 'yyyy-MM-dd'),
          start_time: slot.time,
          end_time: slot.time,
          is_available: slot.available // Respecter directement la valeur available du slot
        }))
      );

      console.log('Total créneaux à sauvegarder:', supabaseAvailabilities.length);
      console.log('Créneaux disponibles:', supabaseAvailabilities.filter(s => s.is_available).length);
      console.log('Créneaux fermés:', supabaseAvailabilities.filter(s => !s.is_available).length);

      // Supprimer d'abord tous les anciens créneaux pour cette période
      const dates = [...new Set(supabaseAvailabilities.map(s => s.specific_date))];
      console.log('Suppression des anciens créneaux pour les dates:', dates);
      
      for (const date of dates) {
        const { error: deleteError } = await supabase
          .from('specific_date_availability')
          .delete()
          .eq('user_id', user.id)
          .eq('specific_date', date);

        if (deleteError) {
          console.error('Erreur lors de la suppression pour', date, ':', deleteError);
          throw deleteError;
        }
      }
      
      console.log('Total créneaux à sauvegarder:', supabaseAvailabilities.length);

      // Utiliser upsert au lieu de delete+insert pour éviter les erreurs de contrainte
      if (supabaseAvailabilities.length > 0) {
        console.log('Upsert des données...');
        
        // Supprimer les doublons potentiels
        const uniqueAvailabilities = supabaseAvailabilities.filter((item, index, self) => 
          index === self.findIndex(t => 
            t.user_id === item.user_id && 
            t.specific_date === item.specific_date && 
            t.start_time === item.start_time &&
            t.end_time === item.end_time
          )
        );
        
        console.log(`Données filtrées: ${uniqueAvailabilities.length} créneaux uniques`);
        
        // Traiter par lots avec upsert
        const batchSize = 100;
        for (let i = 0; i < uniqueAvailabilities.length; i += batchSize) {
          const batch = uniqueAvailabilities.slice(i, i + batchSize);
          console.log(`Upsert du lot ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueAvailabilities.length/batchSize)}: ${batch.length} éléments`);
          
          const { error: upsertError } = await supabase
            .from('specific_date_availability')
            .upsert(batch, {
              onConflict: 'user_id,specific_date,start_time,end_time'
            });

          if (upsertError) {
            console.error('Erreur d\'upsert du lot:', upsertError);
            throw upsertError;
          }
        }
        
        console.log('Upsert réussi');
      } else {
        console.log('Aucune donnée à sauvegarder');
      }

      console.log('=== SAUVEGARDE TERMINÉE ===');
      
      // Recharger les données depuis Supabase pour rafraîchir l'affichage
      await loadAvailabilityFromSupabase();
      
      toast({
        title: "Sauvegarde réussie",
        description: `${supabaseAvailabilities.length} créneaux sauvegardés avec succès.`,
      });
    } catch (error) {
      console.error('=== ERREUR SAUVEGARDE ===', error);
      
      // Afficher plus de détails sur l'erreur
      let errorMessage = "Une erreur est survenue lors de la sauvegarde.";
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = `Erreur: ${error.message}`;
        }
        if ('details' in error) {
          console.error('Détails de l\'erreur:', error.details);
          errorMessage += ` Détails: ${error.details}`;
        }
        if ('hint' in error) {
          console.error('Suggestion:', error.hint);
        }
      }
      
      toast({
        title: "Erreur de sauvegarde",
        description: errorMessage,
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

      // Utiliser selectedWeek si disponible, sinon currentMonth
      const referenceDate = selectedWeek || currentMonth;
      
      // Charger une plage beaucoup plus large pour voir tous les créneaux
      const rangeStart = format(startOfMonth(subMonths(referenceDate, 12)), 'yyyy-MM-dd');
      const rangeEnd = format(endOfMonth(addMonths(referenceDate, 12)), 'yyyy-MM-dd');
      
      console.log('Date de référence:', format(referenceDate, 'yyyy-MM-dd'));
      console.log('Chargement période étendue:', rangeStart, 'à', rangeEnd);

      // Charger les jours bloqués
      const { data: blockedDatesData, error: blockedError } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('user_id', user.id)
        .gte('blocked_date', rangeStart)
        .lte('blocked_date', rangeEnd);

      if (blockedError) {
        console.error('Erreur lors du chargement des jours bloqués:', blockedError);
        throw blockedError;
      }

      console.log('Jours bloqués chargés:', blockedDatesData?.length || 0);
      console.log('Détail des jours bloqués:', blockedDatesData);
      
      // Créer un map des jours bloqués pour une recherche rapide
      const blockedDatesMap = new Map(
        blockedDatesData?.map(blocked => [blocked.blocked_date, blocked.activity]) || []
      );
      
      console.log('Map des jours bloqués:', blockedDatesMap);

      // Charger TOUS les créneaux - pour les admins tous, pour les autres seulement les disponibles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = userProfile?.role === 'admin';

      let query = supabase
        .from('specific_date_availability')
        .select('*')
        .gte('specific_date', rangeStart)
        .lte('specific_date', rangeEnd);

      // Si c'est un admin, charger tous les créneaux de cet utilisateur
      // Si c'est un visiteur/patient, charger seulement les créneaux disponibles
      if (isAdmin) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('is_available', true);
      }

      const { data: availabilityData, error: availabilityError } = await query;

      console.log(`Données chargées: ${availabilityData?.length || 0} créneaux`);
      console.log('Aperçu des données:', availabilityData?.slice(0, 5));

      if (availabilityError) throw availabilityError;

      // Charger les rendez-vous pour la même période
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .gte('appointment_date', rangeStart)
        .lte('appointment_date', rangeEnd)
        .neq('status', 'cancelled'); // Exclure les rendez-vous annulés

      if (appointmentsError) throw appointmentsError;

      console.log('Créneaux disponibles chargés:', availabilityData?.length || 0);
      console.log('Rendez-vous chargés:', appointmentsData?.length || 0);
      console.log('Détail des données de disponibilité:', availabilityData);
      console.log('Détail des rendez-vous:', appointmentsData);

      // Créer un set des créneaux réservés pour une recherche rapide
      const reservedSlots = new Set(
        appointmentsData?.map(apt => {
          console.log('Rendez-vous brut:', apt.appointment_date, apt.appointment_time);
          const key = `${apt.appointment_date}_${formatTimeForDisplay(apt.appointment_time)}`;
          console.log('Clé générée pour réservation:', key);
          return key;
        }) || []
      );

      console.log('TOUS les créneaux réservés:', Array.from(reservedSlots));

       // Convertir les données Supabase en format local
       const groupedByDate = availabilityData?.reduce((acc, item) => {
         const dateKey = item.specific_date;
         if (!acc[dateKey]) {
           acc[dateKey] = [];
         }
          // Normaliser le format d'heure : "09:00:00" -> "09:00"
          const normalizedTime = item.start_time.slice(0, 5);
          const slotKey = `${dateKey}_${normalizedTime}`;
          const isReserved = reservedSlots.has(slotKey);
          console.log(`Vérification créneau: ${slotKey} - réservé: ${isReserved}`);
         
          acc[dateKey].push({
            time: normalizedTime,
            available: item.is_available, // Respecter la valeur is_available de la base de données
            reserved: isReserved // Marquer si le créneau est réservé
          });
         return acc;
       }, {} as Record<string, { time: string; available: boolean; reserved: boolean; }[]>);

      const loadedAvailabilities: SpecificDateAvailability[] = Object.entries(groupedByDate || {}).map(([dateStr, slots]) => {
        const date = new Date(dateStr);
        // Compléter avec tous les créneaux par défaut
        const allSlots = defaultTimeSlots.map(time => {
          const existingSlot = slots.find(s => s.time === time);
          if (existingSlot) {
            return existingSlot;
          }
          // Si le créneau n'existe pas mais que d'autres créneaux existent pour ce jour,
          // le marquer comme fermé plutôt que non disponible
          const slotKey = `${dateStr}_${time}`;
          const isReserved = reservedSlots.has(slotKey);
          return { time, available: false, reserved: isReserved };
        });
        
        // Déterminer si le jour est enabled en fonction des créneaux disponibles
        const hasAvailableSlots = allSlots.some(slot => slot.available);
        
        // Vérifier si ce jour est bloqué
        const isBlocked = blockedDatesMap.has(dateStr);
        const blockActivity = blockedDatesMap.get(dateStr);
        
        console.log(`Date ${dateStr}: isBlocked=${isBlocked}, activity=${blockActivity}`);
        
        return {
          date,
          blocked: isBlocked,
          blockActivity: blockActivity,
          timeSlots: isBlocked ? allSlots.map(slot => ({ ...slot, available: false })) : allSlots // Si bloqué, tous les créneaux sont fermés
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
        
        const defaultAvailabilities: SpecificDateAvailability[] = monthDays.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isBlocked = blockedDatesMap.has(dateStr);
          const blockActivity = blockedDatesMap.get(dateStr);
          
          return {
            date,
            blocked: isBlocked,
            blockActivity: blockActivity,
            timeSlots: defaultTimeSlots.map(time => ({
              time,
              available: false,
              reserved: reservedSlots.has(`${dateStr}_${time}`)
            }))
          };
        });
        
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

  // Recharger les données à chaque fois que le composant est monté ou que la semaine change
  useEffect(() => {
    loadAvailabilityFromSupabase();
    
    // S'abonner aux changements en temps réel des jours bloqués
    const channel = supabase
      .channel('blocked-dates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_dates'
        },
        (payload) => {
          console.log('Changement détecté dans blocked_dates:', payload);
          loadAvailabilityFromSupabase(); // Recharger les données
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedWeek]);

  // Naviguer entre les mois
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  // Obtenir le statut d'un jour pour l'affichage du calendrier
  const getDayStatus = (date: Date) => {
    const availability = getAvailabilityForDate(date);
    const availableSlots = availability.timeSlots.filter(slot => slot.available).length;
    if (availableSlots === 0) return "closed";
    
    const totalSlots = availability.timeSlots.length;
    
    if (availableSlots === 0) return "no-slots";
    if (availableSlots === totalSlots) return "fully-available";
    return "partially-available";
  };

  const selectedDayAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : null;

  // Calculer le taux de remplissage pour la semaine sélectionnée
  const calculateWeekFillRate = () => {
    if (!selectedWeek) return 0;
    
    const weekDays = getWeekDays(selectedWeek).filter(day => day.getDay() !== 0); // Exclure les dimanches
    let totalAvailableSlots = 0;
    let totalReservedSlots = 0;
    
    weekDays.forEach(day => {
      const dayAvailability = getAvailabilityForDate(day);
      const isSaturday = day.getDay() === 6;
      const visibleSlots = isSaturday 
        ? dayAvailability.timeSlots.filter(slot => saturdayTimeSlots.includes(slot.time))
        : dayAvailability.timeSlots;
      
      visibleSlots.forEach(slot => {
        if (slot.available) {
          totalAvailableSlots++;
          if (slot.reserved) {
            totalReservedSlots++;
          }
        }
      });
    });
    
    return totalAvailableSlots > 0 ? Math.round((totalReservedSlots / totalAvailableSlots) * 100) : 0;
  };

  const weekFillRate = selectedWeek ? calculateWeekFillRate() : 0;

  return (
    <div className="space-y-6">
      <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Gestion par Semaine</CardTitle>
                    <CardDescription>
                      Configurez rapidement les disponibilités pour une semaine entière
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium">Taux de remplissage:</div>
                      <Badge variant={weekFillRate >= 80 ? "destructive" : weekFillRate >= 50 ? "default" : "secondary"}>
                        {weekFillRate}%
                      </Badge>
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedWeek && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/10 rounded-lg text-center">
                        <p className="font-medium text-sm">
                          Semaine du {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM", { locale: fr })} au {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })} {getWeekDays(selectedWeek).filter(day => day.getDay() !== 0 && hasAvailableSlots(day)).length} jours ouverts sur 6
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-secondary/50 rounded-lg">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWeek("prev")}
                          className="flex items-center space-x-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Précédente</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWeek("next")}
                          className="flex items-center space-x-1"
                        >
                          <span>Suivante</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>

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
                                const weekDays = getWeekDays(selectedWeek).filter(day => day.getDay() !== 0); // Exclure les dimanches
                                const templateDays = getWeekDays(week).filter(day => day.getDay() !== 0); // Exclure les dimanches
                                
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

                    <div className="grid grid-cols-6 gap-2">
                      {getWeekDays(selectedWeek).filter(day => day.getDay() !== 0).map((day) => {
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
                            
                            {/* Badge de statut du jour */}
                            <div className="flex items-center justify-center mb-2">
                              {dayAvailability.blocked ? (
                                <Badge variant="destructive" className="text-xs">
                                  Bloqué
                                </Badge>
                              ) : availableSlots > 0 ? (
                                <Badge variant="default" className="text-xs">
                                  {availableSlots} créneaux
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Fermé
                                </Badge>
                              )}
                            </div>
                            
                            {dayAvailability.blocked && (
                              <div className="text-xs text-destructive text-center">
                                {dayAvailability.blockActivity}
                              </div>
                            )}
                            
                            {availableSlots >= 0 && !dayAvailability.blocked && (
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {availableSlots}/{dayAvailability.timeSlots.length}
                                </div>
                                
                                {/* Affichage de tous les créneaux de 15 minutes verticalement */}
                                <div className="space-y-1">
                                  {dayAvailability.timeSlots
                                    .filter(slot => {
                                      // Pour les samedis, afficher uniquement jusqu'à 11h45
                                      if (day.getDay() === 6) {
                                        return saturdayTimeSlots.includes(slot.time);
                                      }
                                      return true;
                                    })
                                    .map((slot, slotIndex) => {
                                    let buttonVariant: "success" | "secondary" | "destructive" = "secondary";
                                    let buttonClass = "text-xs h-6 w-full";
                                    let isDisabled = false;
                                    
                                    // Debug pour vérifier les données des créneaux
                                    console.log(`Créneau ${slot.time} - available: ${slot.available}, reserved: ${slot.reserved}`);
                                    
                                    if (slot.reserved) {
                                      buttonVariant = "destructive"; // 🔴 Rouge pour réservé
                                      buttonClass += " opacity-75";
                                      isDisabled = true;
                                    } else if (slot.available) {
                                      buttonVariant = "success"; // 🟢 Vert pour disponible
                                    } else {
                                      buttonVariant = "secondary"; // ⚫ Gris pour fermé
                                    }
                                    
                                    return (
                                      <div key={slot.time}>
                                        <Button
                                          variant={buttonVariant}
                                          size="sm"
                                          className={buttonClass}
                                          onClick={() => !isDisabled && toggleTimeSlot(day, dayAvailability.timeSlots.findIndex(s => s.time === slot.time))}
                                          disabled={isDisabled}
                                          title={slot.reserved ? "Créneau réservé" : (slot.available ? "Créneau disponible" : "Créneau fermé")}
                                        >
                                          {slot.time}
                                          {slot.reserved && <span className="ml-1 text-xs">📅</span>}
                                        </Button>
                                        {/* Ligne de séparation après 12:15 pour indiquer la pause déjeuner */}
                                        {slot.time === "12:15" && (
                                          <div className="flex items-center gap-2 py-2">
                                            <div className="flex-1 border-t border-muted-foreground/30"></div>
                                            <span className="text-xs text-muted-foreground px-2">Pause déjeuner</span>
                                            <div className="flex-1 border-t border-muted-foreground/30"></div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
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
  );
  };