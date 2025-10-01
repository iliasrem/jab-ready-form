import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Générer les créneaux selon la durée choisie entre 09h00 et 18h30
const generateTimeSlots = (duration: number) => {
  const slots = [];
  let hour = 9;
  let minute = 0;
  
  while (hour < 18 || (hour === 18 && minute <= 30)) {
    const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    let endMinute = minute + duration;
    let endHour = hour;
    
    if (endMinute >= 60) {
      endHour++;
      endMinute -= 60;
    }
    
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    slots.push({ start: startTime, end: endTime });
    
    minute += duration;
    if (minute >= 60) {
      minute = minute % 60;
      hour++;
    }
  }
  
  return slots;
};

interface SlotAvailability {
  start: string;
  end: string;
  isAvailable: boolean;
  id?: string;
}

export function MakeupAvailabilityManager() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [slotDuration, setSlotDuration] = useState<number>(20);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate) {
      loadSlotsForDate(selectedDate);
    }
  }, [selectedDate, slotDuration]);

  const loadSlotsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('makeup_availability')
        .select('*')
        .eq('specific_date', dateStr);

      if (error) throw error;

      const timeSlots = generateTimeSlots(slotDuration);
      const loadedSlots = timeSlots.map(slot => {
        const existingSlot = data?.find(
          d => d.start_time === slot.start + ':00' && d.end_time === slot.end + ':00'
        );
        
        return {
          start: slot.start,
          end: slot.end,
          isAvailable: existingSlot?.is_available ?? false,
          id: existingSlot?.id
        };
      });

      setSlots(loadedSlots);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les créneaux"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (index: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[index] = {
        ...newSlots[index],
        isAvailable: !newSlots[index].isAvailable
      };
      return newSlots;
    });
  };

  const saveAvailability = async () => {
    if (!selectedDate) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner une date"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Supprimer les anciens créneaux
      const { error: deleteError } = await supabase
        .from('makeup_availability')
        .delete()
        .eq('user_id', user.id)
        .eq('specific_date', dateStr);

      if (deleteError) throw deleteError;

      // Insérer les nouveaux créneaux actifs
      const slotsToInsert = slots
        .filter(slot => slot.isAvailable)
        .map(slot => ({
          user_id: user.id,
          specific_date: dateStr,
          start_time: slot.start + ':00',
          end_time: slot.end + ':00',
          is_available: true
        }));

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('makeup_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Succès",
        description: "Disponibilités enregistrées"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration des créneaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Durée des créneaux</Label>
            <Select value={slotDuration.toString()} onValueChange={(value) => setSlotDuration(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une durée" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner une date</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={fr}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Créneaux pour le {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`slot-${index}`}
                    checked={slot.isAvailable}
                    onCheckedChange={() => toggleSlot(index)}
                    disabled={loading}
                  />
                  <Label
                    htmlFor={`slot-${index}`}
                    className="text-sm cursor-pointer"
                  >
                    {slot.start} - {slot.end}
                  </Label>
                </div>
              ))}
            </div>

            <Button 
              onClick={saveAvailability} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Enregistrement..." : "Enregistrer les disponibilités"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}