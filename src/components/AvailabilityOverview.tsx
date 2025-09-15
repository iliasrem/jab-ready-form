import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  label: string;
  type: 'weekly' | 'specific';
}

const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

export const AvailabilityOverview = () => {
  const [allAvailability, setAllAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const combinedSlots: AvailabilitySlot[] = [];

      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('availability')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (weeklyError) throw weeklyError;

      // Transform weekly data
      if (weeklyData) {
        weeklyData.forEach(slot => {
          if (slot.day_of_week !== undefined) {
            combinedSlots.push({
              id: slot.id,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: slot.is_available,
              label: `${DAYS_OF_WEEK[slot.day_of_week]} (récurrent)`,
              type: 'weekly'
            });
          }
        });
      }

      // Fetch specific date availability
      const { data: specificData, error: specificError } = await supabase
        .from('specific_date_availability')
        .select('*')
        .order('specific_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (specificError) throw specificError;

      // Transform specific data
      if (specificData) {
        specificData.forEach(slot => {
          if (slot.specific_date) {
            combinedSlots.push({
              id: slot.id,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: slot.is_available,
              label: format(new Date(slot.specific_date), 'EEEE d MMMM yyyy', { locale: fr }),
              type: 'specific'
            });
          }
        });
      }

      setAllAvailability(combinedSlots);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement des disponibilités...</div>
      </div>
    );
  }

  if (allAvailability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Toutes les Disponibilités
          </CardTitle>
          <CardDescription>
            Aperçu de tous vos créneaux disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune disponibilité configurée pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group slots by their label (day or date)
  const groupedSlots: { [key: string]: AvailabilitySlot[] } = {};
  allAvailability.forEach(slot => {
    if (!groupedSlots[slot.label]) {
      groupedSlots[slot.label] = [];
    }
    groupedSlots[slot.label].push(slot);
  });

  const availableCount = allAvailability.filter(s => s.is_available).length;
  const weeklyCount = allAvailability.filter(s => s.type === 'weekly' && s.is_available).length;
  const specificCount = allAvailability.filter(s => s.type === 'specific' && s.is_available).length;

  return (
    <div className="space-y-6">
      
      {/* All Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Toutes les Disponibilités
          </CardTitle>
          <CardDescription>
            Aperçu de tous vos créneaux disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedSlots).map(([label, slots]) => (
              <div key={label} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {slots.filter(s => s.is_available).length} créneaux
                  </Badge>
                </div>
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
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {availableCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Total créneaux
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {weeklyCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Créneaux récurrents
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {specificCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Créneaux spécifiques
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {Object.keys(groupedSlots).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Jours/dates configurés
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};