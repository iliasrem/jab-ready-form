import { useState } from "react";
import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";

const Index = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Gestion des Rendez-vous</h1>
          <p className="text-xl text-muted-foreground">Gérer la disponibilité et les réservations des patients</p>
        </div>
        
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="booking">Réservation Patient</TabsTrigger>
            <TabsTrigger value="appointments">Liste de RDV</TabsTrigger>
            <TabsTrigger value="availability">Disponibilités</TabsTrigger>
            <TabsTrigger value="patients">Liste des Patients</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          </TabsList>
          
          <TabsContent value="booking" className="mt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Réserver votre Rendez-vous</h2>
              <p className="text-muted-foreground">Planifiez votre visite avec notre équipe professionnelle</p>
            </div>
            <AppointmentForm />
          </TabsContent>
          
          <TabsContent value="appointments" className="mt-6">
            <AppointmentsList />
          </TabsContent>
          
          <TabsContent value="availability" className="mt-6">
            <AdvancedAvailabilityManager onAvailabilityChange={setSpecificAvailability} />
          </TabsContent>
          
          <TabsContent value="patients" className="mt-6">
            <PatientList />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <Calendar />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
