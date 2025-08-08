import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Syringe, Printer } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  phone?: string;
  date: Date;
  services?: string[];
}

// Mock appointments data avec plus de données pour 4 semaines
const mockAppointments: Appointment[] = [
  // Semaine 1
  { id: "1", time: "09:00", patientName: "Marie Dupont", date: new Date(), services: ["covid"] },
  { id: "2", time: "10:30", patientName: "Pierre Martin", date: new Date(), services: ["grippe"] },
  { id: "3", time: "14:00", patientName: "Sophie Bernard", date: addDays(new Date(), 1), services: ["covid", "grippe"] },
  { id: "4", time: "11:15", patientName: "Jean Moreau", date: addDays(new Date(), 2), services: ["covid"] },
  
  // Semaine 2
  { id: "5", time: "09:30", patientName: "Claire Dubois", date: addDays(new Date(), 7), services: ["grippe"] },
  { id: "6", time: "15:45", patientName: "Marc Leroy", date: addDays(new Date(), 8), services: ["covid", "grippe"] },
  { id: "7", time: "10:00", patientName: "Anne Petit", date: addDays(new Date(), 9), services: ["covid"] },
  { id: "8", time: "16:30", patientName: "Paul Roux", date: addDays(new Date(), 10), services: ["grippe"] },
  
  // Semaine 3
  { id: "9", time: "09:15", patientName: "Lucie Blanc", date: addDays(new Date(), 14), services: ["covid"] },
  { id: "10", time: "14:30", patientName: "Thomas Noir", date: addDays(new Date(), 15), services: ["covid", "grippe"] },
  { id: "11", time: "11:00", patientName: "Emma Vert", date: addDays(new Date(), 16), services: ["grippe"] },
  { id: "12", time: "15:15", patientName: "Louis Bleu", date: addDays(new Date(), 17), services: ["covid"] },
  
  // Semaine 4
  { id: "13", time: "10:45", patientName: "Julie Rose", date: addDays(new Date(), 21), services: ["covid", "grippe"] },
  { id: "14", time: "16:00", patientName: "Hugo Gris", date: addDays(new Date(), 22), services: ["grippe"] },
  { id: "15", time: "09:45", patientName: "Léa Violet", date: addDays(new Date(), 23), services: ["covid"] },
  { id: "16", time: "14:45", patientName: "Nathan Orange", date: addDays(new Date(), 24), services: ["covid", "grippe"] },
];

const serviceLabels: { [key: string]: string } = {
  covid: "COVID",
  grippe: "Grippe"
};

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

  const getVaccineCountForDay = (date: Date) => {
    const appointments = getAppointmentsForDate(date);
    let covidCount = 0;
    let grippeCount = 0;

    appointments.forEach(apt => {
      if (apt.services) {
        apt.services.forEach(service => {
          if (service === "covid") covidCount++;
          if (service === "grippe") grippeCount++;
        });
      }
    });

    return { covid: covidCount, grippe: grippeCount };
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

  const printDayAppointments = () => {
    const appts = getAppointmentsForDate(selectedDate)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
    const dateLabel = format(selectedDate, "EEEE d MMMM yyyy", { locale: fr });
    const rows = appts
      .map(
        (a) =>
          `<tr><td>${a.time}</td><td>${a.patientName}</td><td>${(a.services || [])
            .map((s) => serviceLabels[s] || s)
            .join(", ")}</td></tr>`
      )
      .join("");

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>RDV ${dateLabel}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px} h1{font-size:20px;margin:0 0 16px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;font-size:12px} th{text-align:left;background:#f5f5f5}</style></head><body><h1>Rendez-vous du ${dateLabel}</h1><table><thead><tr><th>Heure</th><th>Patient</th><th>Services</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Aucun rendez-vous</td></tr>'}</tbody></table></body></html>`;
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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
                    {appointment.phone && (
                      <div className="text-xs text-muted-foreground mt-1">{appointment.phone}</div>
                    )}
                    {appointment.services && appointment.services.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {appointment.services.map(serviceId => serviceLabels[serviceId] || serviceId).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-muted-foreground text-sm">Disponible</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const WeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    // Prendre seulement du lundi au samedi (6 jours)
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 5) });

    return (
      <div className="grid grid-cols-6 gap-2">
        {weekDays.map(day => {
          const appointments = getAppointmentsForDate(day);
          return (
            <Card key={day.toString()} className="min-h-32">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">
                  {format(day, "EEE d", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {appointments.map(apt => (
                  <div key={apt.id} className="text-xs p-1 bg-primary/10 rounded">
                    <div className="font-medium">{apt.time}</div>
                    <div className="truncate">{apt.patientName}</div>
                    {apt.services && apt.services.length > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        {apt.services.map(serviceId => serviceLabels[serviceId] || serviceId).join(", ")}
                      </div>
                    )}
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
                                {apt.services && apt.services.length > 0 && (
                                  <div className="text-[9px] text-muted-foreground">
                                    {apt.services.map(serviceId => serviceLabels[serviceId] || serviceId).join(", ")}
                                  </div>
                                )}
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
                      {apt.services && apt.services.length > 0 && (
                        <div className="text-sm text-primary mt-1">
                          {apt.services.map(serviceId => serviceLabels[serviceId] || serviceId).join(", ")}
                        </div>
                      )}
                    </div>
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
            <h1 className="text-3xl font-bold mb-2">Calendrier</h1>
            <p className="text-muted-foreground">Visualisez et gérez vos rendez-vous</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Retour aux Réservations</span>
          </Button>
        </div>

        {/* Compteur de vaccins pour la journée */}
        {currentView === "day" && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Syringe className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-semibold">
                    {getVaccineCountForDay(selectedDate).covid} vaccin(s) COVID
                  </span>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="flex items-center space-x-2">
                  <Syringe className="h-5 w-5 text-orange-600" />
                  <span className="text-lg font-semibold">
                    {getVaccineCountForDay(selectedDate).grippe} vaccin(s) grippe
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="flex items-center gap-2">
                <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "day" | "week" | "month" | "4weeks")}>
                  <TabsList>
                    <TabsTrigger value="day">Jour</TabsTrigger>
                    <TabsTrigger value="week">Semaine</TabsTrigger>
                    <TabsTrigger value="4weeks">4 Semaines</TabsTrigger>
                    <TabsTrigger value="month">Mois</TabsTrigger>
                  </TabsList>
                </Tabs>
                {currentView === "day" && (
                  <Button variant="outline" size="sm" onClick={printDayAppointments} className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimer la journée
                  </Button>
                )}
              </div>
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