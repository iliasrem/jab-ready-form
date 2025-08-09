import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineManagement } from "@/components/VaccineManagement";
import { VaccineAdministration } from "@/components/VaccineAdministration";
import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users } from "lucide-react";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);
  const [activeTab, setActiveTab] = useState("booking");
  const navigate = useNavigate();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header avec lien de réservation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Rendez-vous</h1>
            <p className="text-sm text-muted-foreground">Interface d'administration</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="default" className="gap-2">
              <Link to="/">
                <Users className="h-4 w-4" />
                Page Patients
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin/disponibilites-vue">
                <CalendarIcon className="h-4 w-4" />
                Disponibilités
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Administration</h2>
            <p className="text-xl text-muted-foreground">Gérer la disponibilité et les réservations des patients</p>
          </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="booking">Réservation Patient</TabsTrigger>
            <TabsTrigger value="appointments">Liste de RDV</TabsTrigger>
            <TabsTrigger value="patients">Liste des Patients</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="vaccines">Gestion Flacons</TabsTrigger>
            <TabsTrigger value="vaccinations">Vaccins Administrés</TabsTrigger>
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
          
          <TabsContent value="patients" className="mt-6">
            <PatientList />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <Calendar />
          </TabsContent>
          
          <TabsContent value="vaccines" className="mt-6">
            <VaccineManagement />
          </TabsContent>
          
          <TabsContent value="vaccinations" className="mt-6">
            <VaccineAdministration />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
