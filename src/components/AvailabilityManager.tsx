import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DayAvailability {
  day: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

const defaultTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"
];

const saturdayTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15"
];

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

interface AvailabilityManagerProps {
  onAvailabilityChange: (availability: DayAvailability[]) => void;
}

export function AvailabilityManager({ onAvailabilityChange }: AvailabilityManagerProps) {
  const { toast } = useToast();
  
  const [availability, setAvailability] = useState<DayAvailability[]>(
    daysOfWeek.map((day, index) => {
      const isSaturday = day === "Saturday";
      const slots = isSaturday ? saturdayTimeSlots : defaultTimeSlots;
      
      return {
        day,
        enabled: day !== "Saturday" && day !== "Sunday", // Weekdays enabled by default
        timeSlots: slots.map(time => ({
          time,
          available: time !== "12:00" && time !== "12:15" // Les créneaux juste avant la pause déjeuner sont fermés par défaut
        }))
      };
    })
  );

  const toggleDay = (dayIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].enabled = !newAvailability[dayIndex].enabled;
    setAvailability(newAvailability);
    onAvailabilityChange(newAvailability);
  };

  const toggleTimeSlot = (dayIndex: number, timeIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].timeSlots[timeIndex].available = 
      !newAvailability[dayIndex].timeSlots[timeIndex].available;
    setAvailability(newAvailability);
    onAvailabilityChange(newAvailability);
  };

  const toggleAllTimeSlotsForDay = (dayIndex: number, enable: boolean) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].timeSlots = newAvailability[dayIndex].timeSlots.map(slot => ({
      ...slot,
      available: enable
    }));
    setAvailability(newAvailability);
    onAvailabilityChange(newAvailability);
  };

  const saveAvailability = () => {
    // Here you would typically save to a database
    toast({
      title: "Availability Updated",
      description: "Your appointment availability has been saved successfully.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Manage Appointment Availability</CardTitle>
        <CardDescription>
          Configure which days and time slots are available for patient bookings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {availability.map((dayAvail, dayIndex) => (
          <div key={dayAvail.day} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={dayAvail.enabled}
                  onCheckedChange={() => toggleDay(dayIndex)}
                />
                <h3 className="text-lg font-medium">{dayAvail.day}</h3>
                <Badge variant={dayAvail.enabled ? "default" : "secondary"}>
                  {dayAvail.enabled ? "Available" : "Closed"}
                </Badge>
              </div>
              {dayAvail.enabled && (
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllTimeSlotsForDay(dayIndex, true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllTimeSlotsForDay(dayIndex, false)}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
            
            {dayAvail.enabled && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 ml-6">
                {dayAvail.timeSlots.map((slot, timeIndex) => (
                  <Button
                    key={slot.time}
                    variant={slot.available ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => toggleTimeSlot(dayIndex, timeIndex)}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <Button onClick={saveAvailability} className="w-full">
            Save Availability Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}