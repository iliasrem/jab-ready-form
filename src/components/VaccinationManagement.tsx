import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar, Clock, Download, Filter, Check, ChevronsUpDown, PackageCheck, TestTube, Biohazard, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTimeForDisplay } from "@/lib/utils";
import * as XLSX from "xlsx";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface VaccineInventoryItem {
  id: string;
  lot_number: string;
  expiry_date: string;
  status: string;
  order_number?: number;
  vials_count?: number;
  opened_vials?: number[];
  discarded_vials?: number[];
  vial_opened_at?: Record<string, string>;
}

interface Vaccination {
  id: string;
  patient_id: string;
  vaccination_date: string;
  vaccination_time: string;
  lot_number: string;
  expiry_date: string;
  notes?: string;
  patients: Patient;
}

export const VaccinationManagement = () => {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<VaccineInventoryItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [activeHolds, setActiveHolds] = useState<Record<string, string>>({});
  const [todayAppointments, setTodayAppointments] = useState<{ time: string; patient: Patient; services?: string[] }[]>([]);
  const [holdVaccines, setHoldVaccines] = useState<Record<string, string>>({});
  const [holdAlert, setHoldAlert] = useState<{ name: string; date: string; vaccine?: string } | null>(null);
  const [vaccinationDate, setVaccinationDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [vaccinationTime, setVaccinationTime] = useState<string>(format(new Date(), "HH:mm"));
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>("");
  // Saisies modifiées manuellement par l'utilisateur (non écrasées par la sélection d'un patient sans RDV)
  const dateTouchedRef = useRef(false);
  const timeTouchedRef = useRef(false);
  const lotTouchedRef = useRef(false);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filteredVaccinations, setFilteredVaccinations] = useState<Vaccination[]>([]);
  const [newPatientForm, setNewPatientForm] = useState({
    first_name: "",
    last_name: "",
    email: ""
  });
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);
  const { toast } = useToast();

  const formatExpiryDate = (dateStr: string) => {
    try {
      // Si c'est déjà au format DD/MM/YYYY, on le retourne tel quel
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return dateStr;
      }
      // Si c'est au format YYYY-MM-DD, on le convertit
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        return format(date, "dd/MM/yyyy");
      }
      // Sinon on retourne tel quel
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const applyDateFilter = () => {
    let filtered = vaccinations;

    if (filterStartDate || filterEndDate) {
      filtered = vaccinations.filter(vaccination => {
        const vaccinationDate = new Date(vaccination.vaccination_date);
        const startDate = filterStartDate ? new Date(filterStartDate) : null;
        const endDate = filterEndDate ? new Date(filterEndDate) : null;

        if (startDate && vaccinationDate < startDate) return false;
        if (endDate && vaccinationDate > endDate) return false;
        
        return true;
      });
    }

    setFilteredVaccinations(filtered);
  };

  const exportToExcel = () => {
    const dataToExport = filteredVaccinations.map(vaccination => ({
      'Date': format(new Date(vaccination.vaccination_date), "dd/MM/yyyy"),
      'Heure': vaccination.vaccination_time,
      'Patient': `${vaccination.patients?.last_name} ${vaccination.patients?.first_name}`,
      'Email': vaccination.patients?.email || '-',
      'Lot N°': vaccination.lot_number,
      'Date d\'expiration': formatExpiryDate(vaccination.expiry_date)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vaccinations');

    // Génère le nom de fichier avec les dates
    let fileName = 'historique-vaccinations';
    if (filterStartDate || filterEndDate) {
      if (filterStartDate) fileName += `_du-${filterStartDate}`;
      if (filterEndDate) fileName += `_au-${filterEndDate}`;
    } else {
      fileName += `_${format(new Date(), "yyyy-MM-dd")}`;
    }
    fileName += '.xlsx';

    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Export réussi",
      description: `Fichier ${fileName} téléchargé avec succès`
    });
  };

  const fetchHolds = async () => {
    const map: Record<string, string> = {};
    const vMap: Record<string, string> = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("vaccine_holds")
        .select("patient_id, reservation_date, vaccines:vaccine_id (name)")
        .eq("status", "reserved")
        .range(from, from + 999);
      if (error || !data) break;
      data.forEach((h) => {
        map[h.patient_id] = h.reservation_date;
        const name = (h as unknown as { vaccines: { name: string } | null }).vaccines?.name;
        if (name) vMap[h.patient_id] = name;
      });
      if (data.length < 1000) break;
    }
    setActiveHolds(map);
    setHoldVaccines(vMap);
  };

  const fetchTodayAppointments = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select("appointment_time, services, patients:patient_id (id, first_name, last_name, email)")
      .eq("appointment_date", today)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });
    const list = (data || [])
      .map((a) => {
        const p = (a as unknown as { patients: Patient | null }).patients;
        return p
          ? {
              time: a.appointment_time as string,
              patient: p,
              services: ((a as unknown as { services?: string[] }).services) || [],
            }
          : null;
      })
      .filter(Boolean) as { time: string; patient: Patient; services?: string[] }[];
    setTodayAppointments(list);
  };

  // Choisit le lot : premier flacon ouvert, en évitant ceux entamés il y a plus de 6h aujourd'hui
  const pickLot = () => {
    if (inventory.length === 0) return;
    const withOpenVial = inventory.find((i) => (i.opened_vials || []).length > 0);
    if (withOpenVial) {
      setSelectedLotNumber(withOpenVial.lot_number);
      return;
    }
    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    const firstUse: Record<string, Date> = {};
    vaccinations
      .filter((v) => v.vaccination_date === today)
      .forEach((v) => {
        const d = new Date(`${today}T${v.vaccination_time.slice(0, 5)}:00`);
        if (!firstUse[v.lot_number] || d < firstUse[v.lot_number]) firstUse[v.lot_number] = d;
      });
    const expired = (lot: string) =>
      firstUse[lot] && now.getTime() - firstUse[lot].getTime() > 6 * 3600 * 1000;
    const started = inventory.find((i) => firstUse[i.lot_number] && !expired(i.lot_number));
    const fresh = inventory.find((i) => !firstUse[i.lot_number]);
    const chosen = started || fresh || inventory[0];
    setSelectedLotNumber(chosen.lot_number);
    if (!started && Object.keys(firstUse).some(expired)) {
      toast({
        title: "Flacon entamé depuis plus de 6h",
        description: "Éliminez le flacon entamé et utilisez un nouveau flacon.",
      });
    }
  };

  // Remplit date/heure/lot uniquement pour les patients ayant un rendez-vous aujourd'hui
  const handleSelectPatient = (patient: Patient, appointmentTime?: string) => {
    setSelectedPatientId(patient.id);
    setOpenPatientCombobox(false);
    if (appointmentTime) {
      setVaccinationDate(format(new Date(), "yyyy-MM-dd"));
      setVaccinationTime(appointmentTime.slice(0, 5));
      pickLot();
    } else {
      // Patient "comptoir" sans RDV aujourd'hui : on pré-remplit à maintenant
      // uniquement si l'utilisateur n'a pas déjà modifié les champs lui-même
      if (!dateTouchedRef.current) setVaccinationDate(format(new Date(), "yyyy-MM-dd"));
      if (!timeTouchedRef.current) setVaccinationTime(format(new Date(), "HH:mm"));
      if (!lotTouchedRef.current) pickLot();
    }
    if (activeHolds[patient.id]) {
      setHoldAlert({
        name: `${patient.last_name} ${patient.first_name}`,
        date: activeHolds[patient.id],
        vaccine: holdVaccines[patient.id],
      });
    }
  };

  useEffect(() => {
    fetchVaccinations();
    fetchPatients();
    fetchInventory();
    fetchHolds();
    fetchTodayAppointments();
  }, []);

  // Applique le filtre quand les vaccinations ou les dates changent
  useEffect(() => {
    applyDateFilter();
  }, [vaccinations, filterStartDate, filterEndDate]);

  // Met à jour l'heure automatiquement chaque minute
  useEffect(() => {
    const interval = setInterval(() => {
      setVaccinationTime(format(new Date(), "HH:mm"));
      fetchInventory();
    }, 60000); // Mise à jour toutes les 60 secondes

    return () => clearInterval(interval);
  }, []);

  const fetchVaccinations = async () => {
    const { data, error } = await supabase
      .from("vaccinations")
      .select(`
        *,
        patients:patient_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("vaccination_date", { ascending: false })
      .order("vaccination_time", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les vaccinations" });
    } else {
      setVaccinations(data || []);
      setFilteredVaccinations(data || []); // Initialise les données filtrées
    }
  };

  const fetchPatients = async () => {
    // Charge tous les patients actifs par blocs de 1000 (limite serveur)
    const all: Patient[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: patientsError } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .order("last_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (patientsError) {
        toast({ title: "Erreur", description: "Impossible de charger les patients" });
        return;
      }
      all.push(...((data || []) as Patient[]));
      if (!data || data.length < 1000) break;
    }
    setPatients(all);
  };

  const SIX_HOURS_MS = 6 * 3600 * 1000;

  // Jette automatiquement tout flacon ouvert depuis plus de 6 heures
  const discardExpiredVials = async (items: VaccineInventoryItem[]) => {
    const now = Date.now();
    let changed = false;

    for (const item of items) {
      const opened = item.opened_vials || [];
      const openedAt = (item.vial_opened_at || {}) as Record<string, string>;
      const expired = opened.filter((n) => {
        const t = openedAt[String(n)];
        return t && now - new Date(t).getTime() > SIX_HOURS_MS;
      });
      if (expired.length === 0) continue;

      const nextOpenedAt = { ...openedAt };
      expired.forEach((n) => delete nextOpenedAt[String(n)]);

      const { error } = await supabase
        .from("vaccine_inventory")
        .update({
          opened_vials: opened.filter((n) => !expired.includes(n)),
          discarded_vials: [...(item.discarded_vials || []), ...expired],
          vial_opened_at: nextOpenedAt,
        })
        .eq("id", item.id);

      if (!error) {
        changed = true;
        item.opened_vials = opened.filter((n) => !expired.includes(n));
        item.discarded_vials = [...(item.discarded_vials || []), ...expired];
        item.vial_opened_at = nextOpenedAt;
        toast({
          title: expired.length > 1 ? "Flacons jetés (plus de 6h)" : `Flacon n°${expired[0]} jeté (plus de 6h)`,
          description: `Lot ${item.lot_number} — déplacé dans les flacons éliminés`,
        });
      }
    }
    return changed;
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("vaccine_inventory")
      .select("id, lot_number, expiry_date, status, order_number, vials_count, opened_vials, discarded_vials, vial_opened_at")
      .eq("status", "open")
      .order("order_number", { ascending: true });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger l'inventaire" });
    } else {
      const items = (data || []) as unknown as VaccineInventoryItem[];
      await discardExpiredVials(items);
      setInventory([...items]);
    }
  };

  const handleAddPatient = async () => {
    if (!newPatientForm.first_name || !newPatientForm.last_name) {
      toast({ title: "Erreur", description: "Nom et prénom obligatoires" });
      return;
    }

    const { data, error } = await supabase
      .from("patients")
      .insert([{
        first_name: newPatientForm.first_name,
        last_name: newPatientForm.last_name,
        email: newPatientForm.email || null
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter le patient" });
    } else {
      setPatients([...patients, data]);
      setSelectedPatientId(data.id);
      setNewPatientForm({ first_name: "", last_name: "", email: "" });
      setShowNewPatientForm(false);
      toast({ title: "Succès", description: "Patient ajouté avec succès" });
    }
  };

  // Gestion des flacons : 1 clic = ouvrir, 2e clic = éliminer
  const handleVialClick = async (item: VaccineInventoryItem, vialNumber: number) => {
    const opened = item.opened_vials || [];
    const discarded = item.discarded_vials || [];
    if (discarded.includes(vialNumber)) return;

    if (!opened.includes(vialNumber)) {
      const { error } = await supabase
        .from("vaccine_inventory")
        .update({
          opened_vials: [...opened, vialNumber],
          vial_opened_at: { ...(item.vial_opened_at || {}), [String(vialNumber)]: new Date().toISOString() },
        })
        .eq("id", item.id);
      if (error) {
        toast({ title: "Erreur", description: "Impossible d'ouvrir le flacon", variant: "destructive" });
      } else {
        toast({ title: `Flacon n°${vialNumber} ouvert`, description: `Lot ${item.lot_number}` });
        fetchInventory();
      }
    } else {
      const { error } = await supabase
        .from("vaccine_inventory")
        .update({
          opened_vials: opened.filter((v) => v !== vialNumber),
          discarded_vials: [...discarded, vialNumber],
          vial_opened_at: (() => {
            const m = { ...(item.vial_opened_at || {}) };
            delete m[String(vialNumber)];
            return m;
          })(),
        })
        .eq("id", item.id);
      if (error) {
        toast({ title: "Erreur", description: "Impossible d'éliminer le flacon", variant: "destructive" });
      } else {
        toast({ title: `Flacon n°${vialNumber} éliminé`, description: `Lot ${item.lot_number} — déplacé dans le cadre des flacons éliminés` });
        fetchInventory();
      }
    }
  };

  // Ouvre automatiquement un flacon du lot si aucun n'est ouvert (première vaccination du jour)
  const autoOpenVial = async (item: VaccineInventoryItem) => {
    const opened = item.opened_vials || [];
    if (opened.length > 0) return;
    const discarded = item.discarded_vials || [];
    const total = item.vials_count || 10;
    for (let n = 1; n <= total; n++) {
      if (!discarded.includes(n)) {
        await supabase
          .from("vaccine_inventory")
          .update({
            opened_vials: [n],
            vial_opened_at: { ...(item.vial_opened_at || {}), [String(n)]: new Date().toISOString() },
          })
          .eq("id", item.id);
        return;
      }
    }
  };

  const handleAddVaccination = async () => {
    if (!selectedPatientId || !selectedLotNumber) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un patient et un lot de vaccin" });
      return;
    }

    const selectedInventoryItem = inventory.find(item => item.lot_number === selectedLotNumber);
    if (!selectedInventoryItem) {
      toast({ title: "Erreur", description: "Lot de vaccin introuvable" });
      return;
    }

    const { error } = await supabase
      .from("vaccinations")
      .insert([{
        patient_id: selectedPatientId,
        vaccination_date: vaccinationDate,
        vaccination_time: vaccinationTime,
        lot_number: selectedLotNumber,
        expiry_date: selectedInventoryItem.expiry_date,
        
      }]);

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la vaccination" });
    } else {
      // Ouvre automatiquement un flacon du lot si aucun n'est ouvert
      await autoOpenVial(selectedInventoryItem);

      // Le vaccin réservé est remis : on clôture la réservation
      if (activeHolds[selectedPatientId]) {
        await supabase
          .from("vaccine_holds")
          .update({ status: "collected", collected_at: new Date().toISOString() })
          .eq("patient_id", selectedPatientId)
          .eq("status", "reserved");
        fetchHolds();
      }

      // Reset form
      setSelectedPatientId("");
      setSelectedLotNumber("");
      dateTouchedRef.current = false;
      timeTouchedRef.current = false;
      lotTouchedRef.current = false;
      setVaccinationDate(format(new Date(), "yyyy-MM-dd"));
      setVaccinationTime(format(new Date(), "HH:mm"));
      
      // Refresh data
      fetchVaccinations();
      fetchInventory();
      fetchTodayAppointments();
      fetchPatients(); // Refresh patients list to remove vaccinated patient
      
      toast({ title: "Succès", description: "Vaccination enregistrée avec succès" });
    }
  };

  const handleDeleteVaccination = async (id: string) => {
    const { error } = await supabase
      .from("vaccinations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la vaccination" });
    } else {
      fetchVaccinations();
      toast({ title: "Succès", description: "Vaccination supprimée avec succès" });
    }
  };

  // Patients déjà vaccinés aujourd'hui : affichés mais barrés
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const vaccinatedToday = new Set(
    vaccinations.filter((v) => v.vaccination_date === todayStr).map((v) => v.patient_id)
  );

  // Passages du jour sans rendez-vous : patients vaccinés aujourd'hui mais absents des RDV
  const appointmentPatientIds = new Set(todayAppointments.map((a) => a.patient.id));
  const todayWalkIns = (() => {
    const byPatient = new Map<string, { time: string; patient: Patient }>();
    vaccinations
      .filter((v) => v.vaccination_date === todayStr && !appointmentPatientIds.has(v.patient_id))
      .forEach((v) => {
        if (byPatient.has(v.patient_id)) return;
        const patient =
          ((v as unknown as { patients: Patient | null }).patients) ||
          patients.find((p) => p.id === v.patient_id);
        if (patient) byPatient.set(v.patient_id, { time: v.vaccination_time, patient });
      });
    return Array.from(byPatient.values()).sort((a, b) => a.time.localeCompare(b.time));
  })();
  const todayPanelEntries = [...todayAppointments, ...todayWalkIns].sort((a, b) =>
    a.time.localeCompare(b.time)
  ) as { time: string; patient: Patient; services?: string[] }[];

  // Icônes covid / grippe à droite des noms : type du rendez-vous, sinon nom du vaccin réservé
  const GRIPPE_NAME_RE = /grippe|eflueida|vaxigrip|fluarix|influvac|fluad|afluria/i;
  const COVID_NAME_RE = /covid|comirnaty|spikevax|nuvaxovid|vidprevutiv/i;
  const vaccineTypesFor = (patientId: string, services?: string[]): ("covid" | "grippe")[] => {
    const types = new Set<"covid" | "grippe">();
    (services || []).forEach((s) => {
      if (s === "covid" || s === "grippe") types.add(s);
    });
    if (types.size === 0) {
      const holdName = holdVaccines[patientId];
      if (holdName) {
        if (GRIPPE_NAME_RE.test(holdName)) types.add("grippe");
        if (COVID_NAME_RE.test(holdName)) types.add("covid");
      }
    }
    return Array.from(types);
  };
  const VaccineTypeIcons = ({ types }: { types: ("covid" | "grippe")[] }) => (
    <span
      className="ml-1 inline-flex shrink-0 items-center gap-0.5"
      title={types.map((t) => (t === "covid" ? "Vaccin Covid" : "Vaccin Grippe")).join(" + ")}
    >
      {types.includes("covid") && (
        <Biohazard className="h-3.5 w-3.5 text-sky-600" aria-label="Vaccin Covid" />
      )}
      {types.includes("grippe") && (
        <Thermometer className="h-3.5 w-3.5 text-orange-500" aria-label="Vaccin Grippe" />
      )}
    </span>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
      <div className="space-y-6 min-w-0">
      <AlertDialog open={!!holdAlert} onOpenChange={(o) => !o && setHoldAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              Vaccin réservé
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              <strong className="capitalize">{holdAlert?.name}</strong> a réservé son vaccin
              {holdAlert?.vaccine ? (
                <>
                  {" "}
                  <strong>{holdAlert.vaccine}</strong>
                </>
              ) : null}
              {holdAlert?.date ? ` le ${format(new Date(`${holdAlert.date}T00:00:00`), "dd/MM/yyyy")}` : ""}.
              <br />
              <br />
              Allez le chercher dans le <strong>pack de vaccins réservés</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Nouvelle Vaccination
            </CardTitle>
            {(() => {
              const item =
                inventory.find((i) => i.lot_number === selectedLotNumber) || inventory[0];
              if (!item) return null;
              const total = item.vials_count || 10;
              const opened = item.opened_vials || [];
              const discarded = item.discarded_vials || [];
              return (
                <div className="flex items-center gap-1.5" title={`Flacons du lot ${item.lot_number} — 1 clic : ouvrir, 2e clic : éliminer`}>
                  <span className="mr-1 text-xs text-muted-foreground">Lot {item.lot_number}</span>
                  {Array.from({ length: total }, (_, idx) => {
                    const n = idx + 1;
                    const isDiscarded = discarded.includes(n);
                    const isOpen = opened.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={isDiscarded}
                        onClick={() => handleVialClick(item, n)}
                        title={
                          isDiscarded
                            ? `Flacon ${n} éliminé`
                            : isOpen
                             ? `Flacon ${n} ouvert${
                                (item.vial_opened_at || {})[String(n)]
                                  ? ` à ${format(new Date((item.vial_opened_at || {})[String(n)]), "HH:mm")} — jeté automatiquement 6h après`
                                  : ""
                              } — cliquer pour éliminer`
                              : `Flacon ${n} fermé — cliquer pour ouvrir`
                        }
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                          isDiscarded
                            ? "border-destructive/40 bg-destructive/10 text-destructive line-through opacity-60"
                            : isOpen
                              ? "border-green-600 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "border-border bg-muted text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient</Label>
              <div className="flex gap-2">
                <Popover open={openPatientCombobox} onOpenChange={setOpenPatientCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPatientCombobox}
                      className="flex-1 justify-between"
                    >
                      {(() => {
                        const sel =
                          patients.find((p) => p.id === selectedPatientId) ||
                          todayAppointments.find((a) => a.patient.id === selectedPatientId)?.patient;
                        return sel ? `${sel.last_name} ${sel.first_name}` : "Sélectionner un patient";
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher un patient..." />
                      <CommandList>
                        <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                        {(todayAppointments.length > 0 || todayWalkIns.length > 0) && (
                          <>
                            <CommandGroup heading="Patients du jour">
                              {todayAppointments.map(({ time, patient, services }) => (
                                <CommandItem
                                  key={`today-${patient.id}-${time}`}
                                  value={`jour ${time} ${patient.last_name} ${patient.first_name}`}
                                  onSelect={() => handleSelectPatient(patient, time)}
                                >
                                  <span className="mr-2 w-12 text-xs font-medium tabular-nums text-muted-foreground">
                                    {time.slice(0, 5)}
                                  </span>
                                  <span className={cn(vaccinatedToday.has(patient.id) && "line-through text-muted-foreground")}>
                                    {patient.last_name} {patient.first_name}
                                  </span>
                                  <VaccineTypeIcons types={vaccineTypesFor(patient.id, services)} />
                                  {activeHolds[patient.id] && (
                                    <Badge variant="secondary" className="ml-auto gap-1">
                                      <PackageCheck className="h-3 w-3" />
                                      Réservé
                                    </Badge>
                                  )}
                                </CommandItem>
                              ))}
                              {todayWalkIns.map(({ time, patient }) => (
                                <CommandItem
                                  key={`walkin-${patient.id}-${time}`}
                                  value={`jour ${time} ${patient.last_name} ${patient.first_name}`}
                                  onSelect={() => handleSelectPatient(patient, time)}
                                >
                                  <span className="mr-2 w-12 text-xs font-medium tabular-nums text-muted-foreground">
                                    {time.slice(0, 5)}
                                  </span>
                                  <span className={cn(vaccinatedToday.has(patient.id) && "line-through text-muted-foreground")}>
                                    {patient.last_name} {patient.first_name}
                                  </span>
                                  <VaccineTypeIcons types={vaccineTypesFor(patient.id)} />
                                  {activeHolds[patient.id] && (
                                    <Badge variant="secondary" className="ml-auto gap-1">
                                      <PackageCheck className="h-3 w-3" />
                                      Réservé
                                    </Badge>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandSeparator />
                          </>
                        )}
                        <CommandGroup heading={todayAppointments.length > 0 ? "Tous les patients" : undefined}>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.last_name} ${patient.first_name} ${patient.id}`}
                              onSelect={() => handleSelectPatient(patient)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className={cn(vaccinatedToday.has(patient.id) && "line-through text-muted-foreground")}>
                                {patient.last_name} {patient.first_name}
                              </span>
                              <VaccineTypeIcons types={vaccineTypesFor(patient.id)} />
                              {activeHolds[patient.id] && (
                                <Badge variant="secondary" className="ml-auto gap-1">
                                  <PackageCheck className="h-3 w-3" />
                                  Réservé
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewPatientForm(!showNewPatientForm)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNewPatientForm && (
                <Card className="p-4 mt-2">
                  <div className="space-y-2">
                    <Input
                      placeholder="Prénom"
                      value={newPatientForm.first_name}
                      onChange={(e) => setNewPatientForm({...newPatientForm, first_name: e.target.value})}
                    />
                    <Input
                      placeholder="Nom"
                      value={newPatientForm.last_name}
                      onChange={(e) => setNewPatientForm({...newPatientForm, last_name: e.target.value})}
                    />
                    <Input
                      placeholder="Email (optionnel)"
                      value={newPatientForm.email}
                      onChange={(e) => setNewPatientForm({...newPatientForm, email: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddPatient} size="sm">Ajouter</Button>
                      <Button variant="outline" onClick={() => setShowNewPatientForm(false)} size="sm">
                        Annuler
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lot">Lot de vaccin</Label>
              <Select value={selectedLotNumber} onValueChange={(v) => { lotTouchedRef.current = true; setSelectedLotNumber(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lot" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.lot_number}>
                      Boîte N°{item.order_number || '?'} - Lot: {item.lot_number} - Exp: {formatExpiryDate(item.expiry_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date de vaccination</Label>
              <Input
                type="date"
                value={vaccinationDate}
                onChange={(e) => { dateTouchedRef.current = true; setVaccinationDate(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure de vaccination</Label>
              <Input
                type="time"
                value={vaccinationTime}
                onChange={(e) => { timeTouchedRef.current = true; setVaccinationTime(e.target.value); }}
              />
            </div>

          </div>

          <Button onClick={handleAddVaccination} className="w-full">
            Enregistrer la vaccination
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Historique des Vaccinations</CardTitle>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={filteredVaccinations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtres par période */}
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4" />
              <h3 className="text-sm font-medium">Filtrer par période</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Date de début</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Date de fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {filteredVaccinations.length} vaccination(s) trouvée(s)
              {filterStartDate || filterEndDate ? 
                ` pour la période ${filterStartDate ? `du ${format(new Date(filterStartDate), "dd/MM/yyyy")} ` : ''}${filterEndDate ? `au ${format(new Date(filterEndDate), "dd/MM/yyyy")}` : ''}` : 
                ' au total'
              }
            </div>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Lot N°</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVaccinations.map((vaccination) => (
                <TableRow key={vaccination.id}>
                  <TableCell>{format(new Date(vaccination.vaccination_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{vaccination.vaccination_time}</TableCell>
                  <TableCell>
                    {vaccination.patients?.last_name} {vaccination.patients?.first_name}
                  </TableCell>
                  <TableCell>{vaccination.lot_number}</TableCell>
                  <TableCell>{formatExpiryDate(vaccination.expiry_date)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVaccination(vaccination.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>

      <Card className="hidden lg:flex lg:flex-col lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            RDV du jour
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {todayPanelEntries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {todayPanelEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun rendez-vous aujourd'hui
            </p>
          ) : (
            todayPanelEntries.map(({ time, patient, services }) => {
              const isSelected = selectedPatientId === patient.id;
              return (
                <button
                  key={`today-panel-${patient.id}-${time}`}
                  type="button"
                  onClick={() => handleSelectPatient(patient, time)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent"
                  )}
                >
                  <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {time.slice(0, 5)}
                  </span>
                  <span className={cn("truncate capitalize", vaccinatedToday.has(patient.id) && "line-through text-muted-foreground")}>
                    {patient.last_name} {patient.first_name}
                  </span>
                  <VaccineTypeIcons types={vaccineTypesFor(patient.id, services)} />
                  {activeHolds[patient.id] && (
                    <Badge variant="secondary" className="ml-auto shrink-0 gap-1">
                      <PackageCheck className="h-3 w-3" />
                      Réservé
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};