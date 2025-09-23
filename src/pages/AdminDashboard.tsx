import { useState } from "react";
import { Link } from "react-router-dom";

import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AvailabilityOverview } from "@/components/AvailabilityOverview";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineInventory } from "@/components/VaccineInventory";
import { VaccinationManagement } from "@/components/VaccinationManagement";
import { ExistingPatientAppointment } from "@/components/ExistingPatientAppointment";
import { BlockedDatesManager } from "@/components/BlockedDatesManager";

import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users } from "lucide-react";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="appointments" className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="appointments">Liste de RDV</TabsTrigger>
                <TabsTrigger value="patients">Liste des Patients</TabsTrigger>
                <TabsTrigger value="existing-booking">RDV Patient Existant</TabsTrigger>
                <TabsTrigger value="calendar">Calendrier</TabsTrigger>
                <TabsTrigger value="manager">Disponibilités</TabsTrigger>
                <TabsTrigger value="inventory">Inventaire</TabsTrigger>
                <TabsTrigger value="vaccination">Vaccination</TabsTrigger>
                <TabsTrigger value="blocked-dates">Jours bloqués</TabsTrigger>
              </TabsList>
              <div className="pb-4"></div>
            </div>
          </div>
        </div>
        
        <div className="px-4">
          <div className="container mx-auto">
            
            <TabsContent value="appointments" className="mt-6">
              <AppointmentsList />
            </TabsContent>
            
            
            <TabsContent value="patients" className="mt-6">
              <PatientList />
            </TabsContent>

            <TabsContent value="existing-booking" className="mt-6">
              <ExistingPatientAppointment />
            </TabsContent>
            
            <TabsContent value="calendar" className="mt-6">
              <Calendar />
            </TabsContent>
            

            <TabsContent value="manager" className="mt-6">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold">Manager les Disponibilités Avancées</h3>
                  <p className="text-sm text-muted-foreground">Configuration complète des créneaux disponibles par date</p>
                </div>
                <AvailabilityOverview />
                <AdvancedAvailabilityManager onAvailabilityChange={setSpecificAvailability} />
              </div>
            </TabsContent>
            
            <TabsContent value="inventory" className="mt-6">
              <VaccineInventory />
            </TabsContent>
            
            <TabsContent value="vaccination" className="mt-6">
              <VaccinationManagement />
            </TabsContent>
            
            <TabsContent value="blocked-dates" className="mt-6">
              <BlockedDatesManager />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
