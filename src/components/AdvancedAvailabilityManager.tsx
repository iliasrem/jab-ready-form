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
import { format, addMonths, subMonths, isSameDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

export interface SpecificDateAvailability {
  date: Date;
  enabled: boolean;
  timeSlots: { time: string; available: boolean; }[];
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
      enabled: !isWeekend, // Activé en semaine par défaut
      timeSlots: defaultTimeSlots.map(time => ({
        time,
        available: !isWeekend && !["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45"].includes(time)
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
          <CardTitle>Gestion des Disponibilités Avancée</CardTitle>
          <CardDescription>
            Configurez vos disponibilités sur plusieurs mois. Sélectionnez une date pour gérer ses créneaux horaires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Navigation des mois */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Mois précédent</span>
            </Button>
            
            <h3 className="text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="flex items-center space-x-2"
            >
              <span>Mois suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Entièrement disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Partiellement disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Aucun créneau</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-sm">Fermé</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Calendrier */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border w-full"
                components={{
                  DayContent: ({ date }) => {
                    const status = getDayStatus(date);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    
                    let bgColor = "";
                    switch (status) {
                      case "fully-available":
                        bgColor = "bg-green-500";
                        break;
                      case "partially-available":
                        bgColor = "bg-yellow-500";
                        break;
                      case "no-slots":
                        bgColor = "bg-red-500";
                        break;
                      default:
                        bgColor = "bg-gray-400";
                    }
                    
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span className={isSelected ? "font-bold" : ""}>{format(date, "d")}</span>
                        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${bgColor}`}></div>
                      </div>
                    );
                  }
                }}
              />
            </div>

            {/* Configuration du jour sélectionné */}
            <div>
              {selectedDate && selectedDayAvailability ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Checkbox
                          checked={selectedDayAvailability.enabled}
                          onCheckedChange={() => toggleDay(selectedDate)}
                        />
                        <Badge variant={selectedDayAvailability.enabled ? "default" : "secondary"}>
                          {selectedDayAvailability.enabled ? "Ouvert" : "Fermé"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {selectedDayAvailability.enabled && (
                    <CardContent className="space-y-4 pb-6">{/* Added bottom padding */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllTimeSlotsForDay(selectedDate, true)}
                        >
                          Tout sélectionner
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllTimeSlotsForDay(selectedDate, false)}
                        >
                          Tout désélectionner
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={applyTemplateToMonth}
                        >
                          Appliquer au mois
                        </Button>
                      </div>

                      {/* Application à une plage de dates */}
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                        <Label className="text-sm font-medium">Appliquer à une plage de dates</Label>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="endDate" className="text-sm">Date de fin :</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-auto"
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={applyTemplateToDateRange}
                            disabled={!endDate}
                            className="flex items-center space-x-1"
                          >
                            <CalendarIcon className="h-4 w-4" />
                            <span>Appliquer</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">{/* Removed max-h-64 overflow-y-auto for extended view */}
                        {selectedDayAvailability.timeSlots.map((slot, index) => (
                          <Button
                            key={slot.time}
                            variant={slot.available ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => toggleTimeSlot(selectedDate, index)}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Sélectionnez une date pour configurer ses disponibilités</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}