import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar, Clock, Download, Filter, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  is_open: boolean;
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
  const [vaccinationDate, setVaccinationDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [vaccinationTime, setVaccinationTime] = useState<string>(format(new Date(), "HH:mm"));
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>("");
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

  useEffect(() => {
    fetchVaccinations();
    fetchPatients();
    fetchInventory();
  }, []);

  // Applique le filtre quand les vaccinations ou les dates changent
  useEffect(() => {
    applyDateFilter();
  }, [vaccinations, filterStartDate, filterEndDate]);

  // Met à jour l'heure automatiquement chaque minute
  useEffect(() => {
    const interval = setInterval(() => {
      setVaccinationTime(format(new Date(), "HH:mm"));
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
    // Get all active patients from the database
    const { data: allPatients, error: patientsError } = await supabase
      .from("patients")
      .select("id, first_name, last_name, email")
      .eq("status", "active")
      .order("last_name", { ascending: true });

    if (patientsError) {
      toast({ title: "Erreur", description: "Impossible de charger les patients" });
      return;
    }

    setPatients(allPatients || []);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("vaccine_inventory")
      .select("id, lot_number, expiry_date, is_open")
      .eq("is_open", true)
      .order("expiry_date");

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger l'inventaire" });
    } else {
      setInventory(data || []);
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
      // Reset form
      setSelectedPatientId("");
      setSelectedLotNumber("");
      
      setVaccinationDate(format(new Date(), "yyyy-MM-dd"));
      setVaccinationTime(format(new Date(), "HH:mm"));
      
      // Refresh data
      fetchVaccinations();
      fetchInventory();
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nouvelle Vaccination
          </CardTitle>
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
                      {selectedPatientId
                        ? patients.find((patient) => patient.id === selectedPatientId)
                            ? `${patients.find((patient) => patient.id === selectedPatientId)?.last_name} ${patients.find((patient) => patient.id === selectedPatientId)?.first_name}`
                            : "Sélectionner un patient"
                        : "Sélectionner un patient"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher un patient..." />
                      <CommandList>
                        <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.last_name} ${patient.first_name}`}
                              onSelect={() => {
                                setSelectedPatientId(patient.id);
                                setOpenPatientCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {patient.last_name} {patient.first_name}
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
              <Select value={selectedLotNumber} onValueChange={setSelectedLotNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lot" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.lot_number}>
                      Lot: {item.lot_number} - Exp: {formatExpiryDate(item.expiry_date)}
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
                onChange={(e) => setVaccinationDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure de vaccination</Label>
              <Input
                type="time"
                value={vaccinationTime}
                onChange={(e) => setVaccinationTime(e.target.value)}
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
  );
};