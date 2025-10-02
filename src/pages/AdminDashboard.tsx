import { useState } from "react";
import { Link } from "react-router-dom";

import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineInventory } from "@/components/VaccineInventory";
import { VaccinationManagement } from "@/components/VaccinationManagement";
import { ExistingPatientAppointment } from "@/components/ExistingPatientAppointment";
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
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="vaccination" className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 gap-1">
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
                  Liste de tous les RDV
                </TabsTrigger>
                <TabsTrigger value="makeup" className="text-xs flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Cosmétique
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
              {!selectedUtility ? (
                <div className="grid grid-cols-1 gap-6">
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedUtility('availability')}>
                    <CardHeader>
                      <CardTitle>Disponibilités</CardTitle>
                      <CardDescription>Manager les disponibilités avancées par date</CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedUtility('inventory')}>
                      <CardHeader>
                        <CardTitle>Inventaire</CardTitle>
                        <CardDescription>Gestion des stocks de vaccins</CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedUtility('statistics')}>
                      <CardHeader>
                        <CardTitle>Statistiques</CardTitle>
                        <CardDescription>Vue d'ensemble des vaccinations et revenus</CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedUtility('existing-patient')}>
                      <CardHeader>
                        <CardTitle>RDV Existant</CardTitle>
                        <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedUtility('patients')}>
                      <CardHeader>
                        <CardTitle>Patients</CardTitle>
                        <CardDescription>Liste de tous les patients enregistrés</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setSelectedUtility(null)}>← Retour aux utilitaires</Button>
                  
                  {selectedUtility === 'availability' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Disponibilités</CardTitle>
                        <CardDescription>Manager les disponibilités avancées par date</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AdvancedAvailabilityManager onAvailabilityChange={setSpecificAvailability} />
                      </CardContent>
                    </Card>
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
                        <CardTitle>RDV Existant</CardTitle>
                        <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ExistingPatientAppointment />
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedUtility === 'patients' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Patients</CardTitle>
                        <CardDescription>Liste de tous les patients enregistrés</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PatientList />
                      </CardContent>
                    </Card>
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
