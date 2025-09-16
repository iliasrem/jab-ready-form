import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTimeForDisplay } from "@/lib/utils";

interface WeeklyAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface SpecificAvailability {
  id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reserved?: boolean;
}

export const AvailabilityOverview = () => {
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability[]>([]);
  const [specificAvailability, setSpecificAvailability] = useState<SpecificAvailability[]>([]);
  const [reservedSlots, setReservedSlots] = useState<Set<string>>(new Set());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const DAYS_OF_WEEK = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h à 19h

  useEffect(() => {
    fetchAvailability();
  }, [currentWeek]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      
      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('availability')
        .select('*')
        .eq('is_available', true);

      if (weeklyError) throw weeklyError;

      // Fetch specific date availability for current week
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

      const { data: specificData, error: specificError } = await supabase
        .from('specific_date_availability')
        .select('*')
        .gte('specific_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('specific_date', format(weekEnd, 'yyyy-MM-dd'));

      if (specificError) throw specificError;

      // Fetch appointments for the current week to identify reserved slots
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled'); // Exclude cancelled appointments

      if (appointmentsError) throw appointmentsError;

      // Create a set of reserved slots for quick lookup
      const reservedSlotsSet = new Set(
        appointmentsData?.map(apt => `${apt.appointment_date}_${formatTimeForDisplay(apt.appointment_time)}`) || []
      );

      setWeeklyAvailability(weeklyData || []);
      setSpecificAvailability(specificData || []);
      setReservedSlots(reservedSlotsSet);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getTimeSlotsForDay = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Start with all hours as unavailable
    const slots: TimeSlot[] = [];
    
    // Add weekly recurring slots for this day
    const weeklySlots = weeklyAvailability.filter(slot => slot.day_of_week === dayOfWeek);
    weeklySlots.forEach(slot => {
      const slotKey = `${dateString}_${slot.start_time.slice(0, 5)}`;
      slots.push({
        start: slot.start_time.slice(0, 5),
        end: slot.end_time.slice(0, 5),
        available: slot.is_available,
        reserved: reservedSlots.has(slotKey)
      });
    });
    
    // Add specific date slots (they override weekly slots)
    const specificSlots = specificAvailability.filter(slot => slot.specific_date === dateString);
    specificSlots.forEach(slot => {
      // Remove any overlapping weekly slots first
      const startTime = slot.start_time.slice(0, 5);
      const endTime = slot.end_time.slice(0, 5);
      
      // Remove overlapping slots
      for (let i = slots.length - 1; i >= 0; i--) {
        if (isTimeOverlapping(slots[i].start, slots[i].end, startTime, endTime)) {
          slots.splice(i, 1);
        }
      }
      
      // Add the specific slot
      const slotKey = `${dateString}_${startTime}`;
      slots.push({
        start: startTime,
        end: endTime,
        available: slot.is_available,
        reserved: reservedSlots.has(slotKey)
      });
    });
    
    return slots.sort((a, b) => a.start.localeCompare(b.start));
  };

  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    return start1 < end2 && start2 < end1;
  };

  const getSlotStyle = (hour: number, slots: TimeSlot[]) => {
    const hourString = `${hour.toString().padStart(2, '0')}:00`;
    
    // Check if this hour falls within any slot
    for (const slot of slots) {
      if (slot.start <= hourString && slot.end > hourString) {
        if (slot.reserved) {
          return "bg-red-200 border-red-300 text-red-800"; // Rouge pour réservé
        } else if (slot.available) {
          return "bg-green-200 border-green-300 text-green-800"; // Vert pour disponible
        } else {
          return "bg-gray-200 border-gray-300 text-gray-600"; // Gris pour occupé/fermé
        }
      }
    }
    
    // Default: no availability defined (closed)
    return "bg-gray-100 border-gray-200 text-gray-400";
  };

  const getSlotText = (hour: number, slots: TimeSlot[]) => {
    const hourString = `${hour.toString().padStart(2, '0')}:00`;
    
    for (const slot of slots) {
      if (slot.start <= hourString && slot.end > hourString) {
        if (slot.reserved) {
          return '📅'; // Icône pour réservé
        } else if (slot.available) {
          return 'Libre';
        } else {
          return 'Fermé';
        }
      }
    }
    
    return 'Fermé';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement des disponibilités...</div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planning des Disponibilités
              </CardTitle>
              <CardDescription>
                Semaine du {format(weekStart, 'd', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-1 text-sm">
            {/* Header with time labels */}
            <div className="p-2 font-medium text-center">Heure</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-2 font-medium text-center">
                <div>{DAYS_OF_WEEK[day.getDay()]}</div>
                <div className="text-xs text-muted-foreground">
                  {format(day, 'd/MM')}
                </div>
              </div>
            ))}
            
            {/* Time slots grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div className="p-2 text-center font-medium text-muted-foreground border-r">
                  {hour}h
                </div>
                
                {/* Day columns */}
                {weekDays.map((day) => {
                  const slots = getTimeSlotsForDay(day);
                  const slotStyle = getSlotStyle(hour, slots);
                  const slotText = getSlotText(hour, slots);
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`p-2 text-center text-xs border rounded min-h-[40px] flex items-center justify-center ${slotStyle}`}
                    >
                      {slotText}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
              <span className="text-sm">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span className="text-sm">Réservé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
              <span className="text-sm">Fermé</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};