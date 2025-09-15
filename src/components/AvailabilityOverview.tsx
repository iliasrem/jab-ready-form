import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AvailabilitySlot {
  id: string;
  day_of_week?: number;
  specific_date?: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

export const AvailabilityOverview = () => {
  const [weeklyAvailability, setWeeklyAvailability] = useState<AvailabilitySlot[]>([]);
  const [specificAvailability, setSpecificAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('availability')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (weeklyError) throw weeklyError;

      // Fetch specific date availability
      const { data: specificData, error: specificError } = await supabase
        .from('specific_date_availability')
        .select('*')
        .order('specific_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (specificError) throw specificError;

      setWeeklyAvailability(weeklyData || []);
      setSpecificAvailability(specificData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds
  };

  const groupWeeklyByDay = () => {
    const grouped: { [key: number]: AvailabilitySlot[] } = {};
    weeklyAvailability.forEach(slot => {
      if (slot.day_of_week !== undefined) {
        if (!grouped[slot.day_of_week]) {
          grouped[slot.day_of_week] = [];
        }
        grouped[slot.day_of_week].push(slot);
      }
    });
    return grouped;
  };

  const groupSpecificByDate = () => {
    const grouped: { [key: string]: AvailabilitySlot[] } = {};
    specificAvailability.forEach(slot => {
      if (slot.specific_date) {
        if (!grouped[slot.specific_date]) {
          grouped[slot.specific_date] = [];
        }
        grouped[slot.specific_date].push(slot);
      }
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement des disponibilités...</div>
      </div>
    );
  }

  const weeklyGrouped = groupWeeklyByDay();
  const specificGrouped = groupSpecificByDate();

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Weekly Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Disponibilités Hebdomadaires
            </CardTitle>
            <CardDescription>
              Créneaux récurrents par jour de la semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(weeklyGrouped).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune disponibilité hebdomadaire configurée
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(weeklyGrouped).map(([dayOfWeek, slots]) => (
                  <div key={dayOfWeek} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">
                      {DAYS_OF_WEEK[parseInt(dayOfWeek)]}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => (
                        <Badge 
                          key={slot.id} 
                          variant={slot.is_available ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specific Date Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Disponibilités Spécifiques
            </CardTitle>
            <CardDescription>
              Créneaux pour des dates particulières
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(specificGrouped).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune disponibilité spécifique configurée
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(specificGrouped)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, slots]) => (
                  <div key={date} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">
                      {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => (
                        <Badge 
                          key={slot.id} 
                          variant={slot.is_available ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {weeklyAvailability.filter(s => s.is_available).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Créneaux hebdomadaires
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {specificAvailability.filter(s => s.is_available).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Créneaux spécifiques
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {Object.keys(weeklyGrouped).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Jours configurés
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {Object.keys(specificGrouped).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Dates spécifiques
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};