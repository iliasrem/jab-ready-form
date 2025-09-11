import { useState } from "react";
import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineManagement } from "@/components/VaccineManagement";
import { VaccineReservation } from "@/components/VaccineReservation";
import { VaccineReservationsList } from "@/components/VaccineReservationsList";
import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users } from "lucide-react";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="booking" className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-4">Administration</h2>
                <p className="text-xl opacity-90">Gérer la disponibilité et les réservations des patients</p>
              </div>
            
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="booking">Réservation Patient</TabsTrigger>
                <TabsTrigger value="appointments">Liste de RDV</TabsTrigger>
                <TabsTrigger value="patients">Liste des Patients</TabsTrigger>
                <TabsTrigger value="vaccines">Réservation Vaccin</TabsTrigger>
                <TabsTrigger value="calendar">Calendrier</TabsTrigger>
                <TabsTrigger value="availability">Disponibilités</TabsTrigger>
                <TabsTrigger value="manager">Manager</TabsTrigger>
              </TabsList>
              <div className="pb-4"></div>
            </div>
          </div>
        </div>
        
        <div className="px-4">
          <div className="container mx-auto">
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
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Gestion des Disponibilités</h3>
                <p className="text-sm text-muted-foreground">Définir les créneaux disponibles de base</p>
              </div>
            </TabsContent>
            
            <TabsContent value="patients" className="mt-6">
              <PatientList />
            </TabsContent>
            
            <TabsContent value="calendar" className="mt-6">
              <Calendar />
            </TabsContent>
            
            <TabsContent value="vaccines" className="mt-6">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Réservation de Vaccins</h2>
                  <p className="text-muted-foreground">Réservez votre vaccin et gérez les réservations</p>
                </div>
                <VaccineReservation />
                <VaccineReservationsList />
                <VaccineManagement />
              </div>
            </TabsContent>

            <TabsContent value="manager" className="mt-6">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold">Manager les Disponibilités Avancées</h3>
                  <p className="text-sm text-muted-foreground">Configuration complète des créneaux disponibles par date</p>
                </div>
                <AdvancedAvailabilityManager onAvailabilityChange={setSpecificAvailability} />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
