import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router-dom";


import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { AppointmentsList } from "@/components/AppointmentsList";
import { PatientList } from "@/components/PatientList";
import { VaccineInventory } from "@/components/VaccineInventory";
import { VaccinationManagement } from "@/components/VaccinationManagement";
import { ExistingPatientAppointment } from "@/components/ExistingPatientAppointment";
import { Statistics } from "@/components/Statistics";
import { VaccineReservationsTab } from "@/components/VaccineReservationsTab";
import { VaccineList } from "@/components/VaccineList";
import { ArchiveSeasonTool } from "@/components/archives/ArchiveSeasonTool";
import { SeasonHistoryViewer } from "@/components/archives/SeasonHistoryViewer";
import { AgeGroupStats } from "@/components/AgeGroupStats";
import { PatientImport } from "@/components/PatientImport";
import { PharmacyBooking } from "@/components/PharmacyBooking";


import Calendar from "./Calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  Settings,
  Package,
  Store,
  Syringe,
  Wrench,
  ClipboardList,
  Copy
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [specificAvailability, setSpecificAvailability] = useState<SpecificDateAvailability[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "vaccination");

  // Permet d'ouvrir un onglet précis via ?tab=... (bouton du header)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, [searchParams]);


  // ===== Suivi des modifications non sauvegardées (disponibilités) =====
  const [availabilityDirty, setAvailabilityDirty] = useState(false);
  const availabilityDirtyRef = useRef(false);
  const saveAvailabilityRef = useRef<(() => Promise<boolean>) | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false);

  const handleDirtyChange = (dirty: boolean) => {
    availabilityDirtyRef.current = dirty;
    setAvailabilityDirty(dirty);
  };

  // Bloque la navigation vers une autre route tant qu'il reste des modifications non sauvegardées
  const blocker = useBlocker(availabilityDirty);

  // Intercepte un changement de vue (onglet, retour aux utilitaires) si non sauvegardé
  const guardAction = (action: () => void) => {
    if (availabilityDirtyRef.current) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const cancelLeave = () => {
    setPendingAction(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  const handleLeaveWithoutSaving = () => {
    const action = pendingAction;
    handleDirtyChange(false);
    setPendingAction(null);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else {
      action?.();
    }
  };

  const handleSaveAndLeave = async () => {
    setSavingBeforeLeave(true);
    try {
      const ok = (await saveAvailabilityRef.current?.()) ?? false;
      if (ok) {
        const action = pendingAction;
        setPendingAction(null);
        if (blocker.state === "blocked") {
          blocker.proceed();
        } else {
          action?.();
        }
      }
    } finally {
      setSavingBeforeLeave(false);
    }
  };

  const unsavedDialogOpen = pendingAction !== null || blocker.state === "blocked";

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={(value) => guardAction(() => { setActiveTab(value); if (searchParams.get("tab")) setSearchParams({}, { replace: true }); })} className="w-full">
        <div className="bg-brand text-brand-foreground">
          <div className="py-6 px-4">
            <div className="container mx-auto">
              <TabsList className="flex w-full gap-1">
                <TabsTrigger value="vaccination" className="flex-1 min-w-0 text-xs flex items-center justify-center gap-1 px-2 py-1.5">
                  <Syringe className="h-3 w-3 shrink-0" />
                  Vaccination
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex-1 min-w-0 text-xs flex items-center justify-center gap-1 px-2 py-1.5">
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  RDV du jour
                </TabsTrigger>
                <TabsTrigger value="appointments" className="flex-1 min-w-0 text-xs flex items-center justify-center gap-1 px-2 py-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  Tous les RDV
                </TabsTrigger>
                <TabsTrigger value="pharmacy-booking" className="flex-1 min-w-0 text-xs flex items-center justify-center gap-1 px-2 py-1.5">
                  <Store className="h-3 w-3 shrink-0" />
                  RDV via pharmacie
                </TabsTrigger>
                <TabsTrigger value="reservations" className="flex-[1.5] min-w-0 text-[10px] leading-tight flex items-center justify-center gap-1 px-1 py-1.5">
                  <ClipboardList className="h-3 w-3 shrink-0" />
                  Réservation de vaccins manquants
                </TabsTrigger>

                <TabsTrigger value="utilities" className="flex-1 min-w-0 text-xs flex items-center justify-center gap-1 px-2 py-1.5">
                  <Wrench className="h-3 w-3 shrink-0" />
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

            <TabsContent value="pharmacy-booking" className="mt-6">
              <PharmacyBooking />
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
                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-indigo-50 dark:bg-indigo-950/30" onClick={() => setSelectedUtility('historique')}>
                    <CardHeader>
                      <CardTitle>Archives</CardTitle>
                      <CardDescription>Consulter l'historique des saisons archivées</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-blue-50 dark:bg-blue-950/30" onClick={() => setSelectedUtility('availability')}>
                    <CardHeader>
                      <CardTitle>Disponibilités</CardTitle>
                      <CardDescription>Manager les disponibilités avancées par date</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-cyan-50 dark:bg-cyan-950/30" onClick={() => setSelectedUtility('age-groups')}>
                    <CardHeader>
                      <CardTitle>IA</CardTitle>
                      <CardDescription>Répartition des patients par âge et estimation des vaccins</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-rose-50 dark:bg-rose-950/30" onClick={() => setSelectedUtility('import-patients')}>
                    <CardHeader>
                      <CardTitle>Import de patients (IA)</CardTitle>
                      <CardDescription>Importer un fichier Excel/CSV et fusionner les doublons</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-green-50 dark:bg-green-950/30" onClick={() => setSelectedUtility('inventory')}>
                    <CardHeader>
                      <CardTitle>Inventaire</CardTitle>
                      <CardDescription>Gestion des stocks de vaccins</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-amber-50 dark:bg-amber-950/30" onClick={() => setSelectedUtility('archives')}>
                    <CardHeader>
                      <CardTitle>Module d'archivage manuel</CardTitle>
                      <CardDescription>Archiver une saison terminée</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-teal-50 dark:bg-teal-950/30" onClick={() => setSelectedUtility('vaccines')}>
                    <CardHeader>
                      <CardTitle>Noms des vaccins grippe disponibles</CardTitle>
                      <CardDescription>Gérer la liste des vaccins disponibles</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-pink-50 dark:bg-pink-950/30" onClick={() => setSelectedUtility('patients')}>
                    <CardHeader>
                      <CardTitle>Patients</CardTitle>
                      <CardDescription>Liste de tous les patients enregistrés</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-orange-50 dark:bg-orange-950/30" onClick={() => setSelectedUtility('existing-patient')}>
                    <CardHeader>
                      <CardTitle>RDV pour patients Existants</CardTitle>
                      <CardDescription>Créer un rendez-vous pour un patient existant</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="cursor-pointer hover:brightness-95 transition-all bg-purple-50 dark:bg-purple-950/30" onClick={() => setSelectedUtility('statistics')}>
                    <CardHeader>
                      <CardTitle>Statistiques</CardTitle>
                      <CardDescription>Vue d'ensemble des vaccinations et revenus</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => guardAction(() => setSelectedUtility(null))}>← Retour aux utilitaires</Button>

                  {selectedUtility === 'availability' && (
                    <AdvancedAvailabilityManager
                      onAvailabilityChange={setSpecificAvailability}
                      onDirtyChange={handleDirtyChange}
                      registerSaveHandler={(fn) => { saveAvailabilityRef.current = fn; }}
                    />
                  )}

                  {selectedUtility === 'inventory' && (
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle>Inventaire</CardTitle>
                          <CardDescription>Gestion des stocks de vaccins</CardDescription>
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">CNK 5871900 – COMIRNATY XFG (10 flacons)</span>
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

                  {selectedUtility === 'vaccines' && (
                    <VaccineList />
                  )}

                  {selectedUtility === 'historique' && (
                    <SeasonHistoryViewer />
                  )}

                  {selectedUtility === 'archives' && (
                    <ArchiveSeasonTool />
                  )}

                  {selectedUtility === 'age-groups' && (
                    <AgeGroupStats />
                  )}

                  {selectedUtility === 'import-patients' && (
                    <PatientImport />
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Popup de confirmation en cas de modifications non sauvegardées */}
      <AlertDialog open={unsavedDialogOpen} onOpenChange={(open) => { if (!open) cancelLeave(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez modifié les disponibilités sans les sauvegarder. Voulez-vous sauvegarder avant de quitter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingBeforeLeave}>Annuler</AlertDialogCancel>
            <Button variant="outline" disabled={savingBeforeLeave} onClick={handleLeaveWithoutSaving}>
              Quitter sans sauvegarder
            </Button>
            <AlertDialogAction
              disabled={savingBeforeLeave}
              onClick={(e) => {
                e.preventDefault();
                handleSaveAndLeave();
              }}
            >
              {savingBeforeLeave ? "Sauvegarde en cours..." : "Sauvegarder et continuer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
