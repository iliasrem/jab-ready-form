import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth } from "date-fns";

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: "Vaccine" | "Cosmetic";
  date: Date;
}

// Mock appointments data
const mockAppointments: Appointment[] = [
  {
    id: "1",
    time: "09:00",
    patientName: "John Doe",
    service: "Vaccine",
    date: new Date()
  },
  {
    id: "2",
    time: "10:30",
    patientName: "Jane Smith",
    service: "Cosmetic",
    date: new Date()
  },
  {
    id: "3",
    time: "14:00",
    patientName: "Mike Johnson",
    service: "Vaccine",
    date: addDays(new Date(), 1)
  }
];

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("month");

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
    } else {
      setSelectedDate(direction === "next" ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
    }
  };

  const getViewTitle = () => {
    if (currentView === "day") {
      return format(selectedDate, "EEEE, MMMM d, yyyy");
    } else if (currentView === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(selectedDate, "MMMM yyyy");
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
                    <Badge variant={appointment.service === "Vaccine" ? "default" : "secondary"}>
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
                    <Badge variant={apt.service === "Vaccine" ? "default" : "secondary"}>
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
              Appointments for {format(selectedDate, "EEEE, MMMM d")}
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
                    <Badge variant={apt.service === "Vaccine" ? "default" : "secondary"}>
                      {apt.service}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No appointments scheduled for this date.</p>
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
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "day" | "week" | "month")}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {currentView === "day" && <DayView />}
            {currentView === "week" && <WeekView />}
            {currentView === "month" && <MonthView />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;