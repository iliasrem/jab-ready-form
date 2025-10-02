import { useState } from "react";
import { Link } from "react-router-dom";

import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineInventory } from "@/components/VaccineInventory";
import { VaccinationManagement } from "@/components/VaccinationManagement";
import { ExistingPatientAppointment } from "@/components/ExistingPatientAppointment";
import { BlockedDatesManager } from "@/components/BlockedDatesManager";
import { Statistics } from "@/components/Statistics";
import { MakeupAvailabilityManager } from "@/components/MakeupAvailabilityManager";
import { MakeupAppointmentForm } from "@/components/MakeupAppointmentForm";
import { MakeupAppointmentsList } from "@/components/MakeupAppointmentsList";

import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Settings, 
  Package, 
  Syringe, 
  Palette,
  Wrench
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="calendar" className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
                <TabsTrigger value="calendar" className="text-xs flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  RDV du jour
                </TabsTrigger>
                <TabsTrigger value="appointments" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Liste de tous les RDV
                </TabsTrigger>
                <TabsTrigger value="manager" className="text-xs flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Disponibilités
                </TabsTrigger>
                <TabsTrigger value="vaccination" className="text-xs flex items-center gap-1">
                  <Syringe className="h-3 w-3" />
                  Vaccination
                </TabsTrigger>
                <TabsTrigger value="makeup" className="text-xs flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Maquillage
                </TabsTrigger>
                <TabsTrigger value="utilities" className="text-xs flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Utilitaires
                </TabsTrigger>
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
            
            <TabsContent value="calendar" className="mt-6">
              <Calendar />
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
            
            <TabsContent value="vaccination" className="mt-6">
              <VaccinationManagement />
            </TabsContent>
            
            <TabsContent value="makeup" className="mt-6">
              <div className="space-y-6">
                <Tabs defaultValue="appointments" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
                    <TabsTrigger value="new">Nouveau RDV</TabsTrigger>
                    <TabsTrigger value="availability">Disponibilités</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="appointments" className="mt-4">
                    <MakeupAppointmentsList />
                  </TabsContent>
                  
                  <TabsContent value="new" className="mt-4">
                    <MakeupAppointmentForm />
                  </TabsContent>
                  
                  <TabsContent value="availability" className="mt-4">
                    <MakeupAvailabilityManager />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="utilities" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventaire</CardTitle>
                    <CardDescription>Gestion des stocks de vaccins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VaccineInventory />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques</CardTitle>
                    <CardDescription>Vue d'ensemble des vaccinations et revenus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Statistics />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Jours bloqués</CardTitle>
                    <CardDescription>Gérer les dates de fermeture et événements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BlockedDatesManager />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>RDV Existant</CardTitle>
                    <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExistingPatientAppointment />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Patients</CardTitle>
                    <CardDescription>Liste de tous les patients enregistrés</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PatientList />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
