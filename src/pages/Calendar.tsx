import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: "Vaccin Covid" | "Cosmétique";
  date: Date;
}

// Mock appointments data avec plus de données pour 4 semaines
const mockAppointments: Appointment[] = [
  // Semaine 1
  { id: "1", time: "09:00", patientName: "Marie Dupont", service: "Vaccin Covid", date: new Date() },
  { id: "2", time: "10:30", patientName: "Pierre Martin", service: "Cosmétique", date: new Date() },
  { id: "3", time: "14:00", patientName: "Sophie Bernard", service: "Vaccin Covid", date: addDays(new Date(), 1) },
  { id: "4", time: "11:15", patientName: "Jean Moreau", service: "Cosmétique", date: addDays(new Date(), 2) },
  
  // Semaine 2
  { id: "5", time: "09:30", patientName: "Claire Dubois", service: "Vaccin Covid", date: addDays(new Date(), 7) },
  { id: "6", time: "15:45", patientName: "Marc Leroy", service: "Cosmétique", date: addDays(new Date(), 8) },
  { id: "7", time: "10:00", patientName: "Anne Petit", service: "Vaccin Covid", date: addDays(new Date(), 9) },
  { id: "8", time: "16:30", patientName: "Paul Roux", service: "Cosmétique", date: addDays(new Date(), 10) },
  
  // Semaine 3
  { id: "9", time: "09:15", patientName: "Lucie Blanc", service: "Vaccin Covid", date: addDays(new Date(), 14) },
  { id: "10", time: "14:30", patientName: "Thomas Noir", service: "Cosmétique", date: addDays(new Date(), 15) },
  { id: "11", time: "11:00", patientName: "Emma Vert", service: "Vaccin Covid", date: addDays(new Date(), 16) },
  { id: "12", time: "15:15", patientName: "Louis Bleu", service: "Cosmétique", date: addDays(new Date(), 17) },
  
  // Semaine 4
  { id: "13", time: "10:45", patientName: "Julie Rose", service: "Vaccin Covid", date: addDays(new Date(), 21) },
  { id: "14", time: "16:00", patientName: "Hugo Gris", service: "Cosmétique", date: addDays(new Date(), 22) },
  { id: "15", time: "09:45", patientName: "Léa Violet", service: "Vaccin Covid", date: addDays(new Date(), 23) },
  { id: "16", time: "14:45", patientName: "Nathan Orange", service: "Cosmétique", date: addDays(new Date(), 24) },
];

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<"day" | "week" | "month" | "4weeks">("4weeks");

  const getAppointmentsForDate = (date: Date) => {
    return mockAppointments.filter(apt => isSameDay(apt.date, date));
  };

  const getAppointmentsForWeek = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return mockAppointments.filter(apt => 
      apt.date >= weekStart && apt.date <= weekEnd
    );
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (currentView === "day") {
      setSelectedDate(direction === "next" ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    } else if (currentView === "week") {
      setSelectedDate(direction === "next" ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
    } else if (currentView === "4weeks") {
      setSelectedDate(direction === "next" ? addWeeks(selectedDate, 4) : subWeeks(selectedDate, 4));
    } else {
      setSelectedDate(direction === "next" ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
    }
  };

  const getViewTitle = () => {
    if (currentView === "day") {
      return format(selectedDate, "EEEE d MMMM yyyy", { locale: fr });
    } else if (currentView === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
    } else if (currentView === "4weeks") {
      const week1Start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const week4End = addDays(week1Start, 27); // 4 semaines = 28 jours
      return `${format(week1Start, "d MMM", { locale: fr })} - ${format(week4End, "d MMM yyyy", { locale: fr })}`;
    } else {
      return format(selectedDate, "MMMM yyyy", { locale: fr });
    }
  };

  const DayView = () => {
    const appointments = getAppointmentsForDate(selectedDate);
    const timeSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00"
    ];

    return (
      <div className="space-y-2">
        {timeSlots.map(time => {
          const appointment = appointments.find(apt => apt.time === time);
          return (
            <div key={time} className="flex items-center space-x-4 p-2 border rounded">
              <div className="w-16 text-sm font-medium">{time}</div>
              {appointment ? (
                <div className="flex-1 flex items-center justify-between bg-primary/10 p-2 rounded">
                  <div>
                    <div className="font-medium">{appointment.patientName}</div>
                    <Badge variant={appointment.service === "Vaccin Covid" ? "default" : "secondary"}>
                      {appointment.service}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-muted-foreground text-sm">Available</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const WeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const appointments = getAppointmentsForDate(day);
          return (
            <Card key={day.toString()} className="min-h-32">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">
                  {format(day, "EEE d")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {appointments.map(apt => (
                  <div key={apt.id} className="text-xs p-1 bg-primary/10 rounded">
                    <div className="font-medium">{apt.time}</div>
                    <div className="truncate">{apt.patientName}</div>
                    <Badge variant={apt.service === "Vaccin Covid" ? "default" : "secondary"}>
                      {apt.service}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Vue 4 semaines côte à côte
  const FourWeeksView = () => {
    const week1Start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weeks = [
      { start: week1Start, end: addDays(week1Start, 6) },
      { start: addDays(week1Start, 7), end: addDays(week1Start, 13) },
      { start: addDays(week1Start, 14), end: addDays(week1Start, 20) },
      { start: addDays(week1Start, 21), end: addDays(week1Start, 27) }
    ];

    return (
      <div className="grid grid-cols-4 gap-4">
        {weeks.map((week, weekIndex) => {
          const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
          return (
            <div key={weekIndex} className="space-y-2">
              {/* En-tête avec dates de la semaine */}
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {format(week.start, "d MMM", { locale: fr })} - {format(week.end, "d MMM", { locale: fr })}
                </p>
              </div>
              
              {/* Jours de la semaine */}
              <div className="space-y-2">
                {weekDays.map(day => {
                  const appointments = getAppointmentsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <Card key={day.toString()} className={`min-h-20 ${isToday ? 'ring-2 ring-primary' : ''}`}>
                      <CardHeader className="pb-1 pt-2 px-2">
                        <CardTitle className="text-xs text-center">
                          <div className={`${isToday ? 'text-primary font-bold' : ''}`}>
                            {format(day, "EEE d", { locale: fr })}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-2 pb-2">
                        <div className="space-y-1">
                          {appointments.length > 0 ? (
                            appointments.map(apt => (
                              <div key={apt.id} className="text-xs p-1 bg-primary/10 rounded">
                                <div className="font-medium text-[10px]">{apt.time}</div>
                                <div className="truncate text-[10px]" title={apt.patientName}>
                                  {apt.patientName}
                                </div>
                                <div className="mt-1">
                                  <Badge 
                                    variant={apt.service === "Vaccin Covid" ? "default" : "secondary"}
                                    className="text-[8px] h-4 px-1"
                                  >
                                    {apt.service === "Vaccin Covid" ? "Vaccin" : "Cosmé"}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-muted-foreground text-center py-1">
                              Libre
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const MonthView = () => {
    return (
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          className="rounded-md border"
          components={{
            DayContent: ({ date }) => {
              const appointments = getAppointmentsForDate(date);
              return (
                <div className="relative w-full h-full">
                  <div>{format(date, "d")}</div>
                  {appointments.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0">
                      <div className="flex justify-center">
                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          }}
        />
        
        {/* Show appointments for selected date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Rendez-vous pour le {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getAppointmentsForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getAppointmentsForDate(selectedDate).map(apt => (
                  <div key={apt.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{apt.patientName}</div>
                      <div className="text-sm text-muted-foreground">{apt.time}</div>
                    </div>
                    <Badge variant={apt.service === "Vaccin Covid" ? "default" : "secondary"}>
                      {apt.service}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun rendez-vous prévu pour cette date.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calendar</h1>
            <p className="text-muted-foreground">View and manage your appointments</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Back to Booking</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl">{getViewTitle()}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "day" | "week" | "month" | "4weeks")}>
                <TabsList>
                  <TabsTrigger value="day">Jour</TabsTrigger>
                  <TabsTrigger value="week">Semaine</TabsTrigger>
                  <TabsTrigger value="4weeks">4 Semaines</TabsTrigger>
                  <TabsTrigger value="month">Mois</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {currentView === "day" && <DayView />}
            {currentView === "week" && <WeekView />}
            {currentView === "4weeks" && <FourWeeksView />}
            {currentView === "month" && <MonthView />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;