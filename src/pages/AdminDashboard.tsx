import { useState } from "react";
import { Link } from "react-router-dom";

import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineInventory } from "@/components/VaccineInventory";
import { VaccinationManagement } from "@/components/VaccinationManagement";
import { ExistingPatientAppointment } from "@/components/ExistingPatientAppointment";
import { Statistics } from "@/components/Statistics";
import { VaccineReservationsTab } from "@/components/VaccineReservationsTab";

import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Settings, 
  Package, 
  Syringe, 
  Wrench,
  ClipboardList
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="vaccination" className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
                <TabsTrigger value="vaccination" className="text-xs flex items-center gap-1">
                  <Syringe className="h-3 w-3" />
                  Vaccination
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  RDV du jour
                </TabsTrigger>
                <TabsTrigger value="appointments" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tous les RDV
                </TabsTrigger>
                <TabsTrigger value="reservations" className="text-xs flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Réservations
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
            
            <TabsContent value="calendar" className="mt-6">
              <Calendar />
            </TabsContent>
            
            <TabsContent value="appointments" className="mt-6">
              <AppointmentsList />
            </TabsContent>
            
            <TabsContent value="vaccination" className="mt-6">
              <VaccinationManagement />
            </TabsContent>

            <TabsContent value="reservations" className="mt-6">
              <VaccineReservationsTab />
            </TabsContent>
            
            <TabsContent value="utilities" className="mt-6">
              {!selectedUtility ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-blue-50 dark:bg-blue-950/30" onClick={() => setSelectedUtility('availability')}>
                    <CardHeader>
                      <CardTitle>Disponibilités</CardTitle>
                      <CardDescription>Manager les disponibilités avancées par date</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-green-50 dark:bg-green-950/30" onClick={() => setSelectedUtility('inventory')}>
                    <CardHeader>
                      <CardTitle>Inventaire</CardTitle>
                      <CardDescription>Gestion des stocks de vaccins</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-purple-50 dark:bg-purple-950/30" onClick={() => setSelectedUtility('statistics')}>
                    <CardHeader>
                      <CardTitle>Statistiques</CardTitle>
                      <CardDescription>Vue d'ensemble des vaccinations et revenus</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-orange-50 dark:bg-orange-950/30" onClick={() => setSelectedUtility('existing-patient')}>
                    <CardHeader>
                      <CardTitle>RDV pour patients Existants</CardTitle>
                      <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-pink-50 dark:bg-pink-950/30" onClick={() => setSelectedUtility('patients')}>
                    <CardHeader>
                      <CardTitle>Patients</CardTitle>
                      <CardDescription>Liste de tous les patients enregistrés</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setSelectedUtility(null)}>← Retour aux utilitaires</Button>
                  
                  {selectedUtility === 'availability' && (
                    <AdvancedAvailabilityManager onAvailabilityChange={setSpecificAvailability} />
                  )}
                  
                  {selectedUtility === 'inventory' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Inventaire</CardTitle>
                        <CardDescription>Gestion des stocks de vaccins</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <VaccineInventory />
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedUtility === 'statistics' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Statistiques</CardTitle>
                        <CardDescription>Vue d'ensemble des vaccinations et revenus</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Statistics />
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedUtility === 'existing-patient' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>RDV pour patients Existants</CardTitle>
                        <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ExistingPatientAppointment />
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedUtility === 'patients' && (
                    <PatientList />
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
