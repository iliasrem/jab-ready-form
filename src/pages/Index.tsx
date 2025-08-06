import { useState } from "react";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AvailabilityManager, DayAvailability } from "@/components/AvailabilityManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Appointment Management</h1>
          <p className="text-xl text-muted-foreground">Manage availability and patient bookings</p>
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
