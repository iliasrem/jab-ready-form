import { useState } from "react";
import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AvailabilityManager, DayAvailability } from "@/components/AvailabilityManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";

const Index = () => {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-4">Appointment Management</h1>
            <p className="text-xl text-muted-foreground">Manage availability and patient bookings</p>
          </div>
          <div className="flex space-x-3">
            <Link to="/book">
              <Button variant="default" className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Patient Booking</span>
              </Button>
            </Link>
            <Link to="/calendar">
              <Button variant="outline" className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4" />
                <span>View Calendar</span>
              </Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking">Patient Booking</TabsTrigger>
            <TabsTrigger value="availability">Manage Availability</TabsTrigger>
          </TabsList>
          
          <TabsContent value="booking" className="mt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Book Your Appointment</h2>
              <p className="text-muted-foreground">Schedule your visit with our professional team</p>
            </div>
            <AppointmentForm availability={availability} />
          </TabsContent>
          
          <TabsContent value="availability" className="mt-6">
            <AvailabilityManager onAvailabilityChange={setAvailability} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
