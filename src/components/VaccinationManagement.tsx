import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  vials_count: number;
  vials_used: number;
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
  
  const [newPatientForm, setNewPatientForm] = useState({
    first_name: "",
    last_name: "",
    email: ""
  });
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVaccinations();
    fetchPatients();
    fetchInventory();
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
    }
  };

  const fetchPatients = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Get patients with appointments today
    const { data: patientsWithAppointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        patient_id,
        patients!inner (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("appointment_date", today)
      .eq("patients.status", "active");

    if (appointmentsError) {
      toast({ title: "Erreur", description: "Impossible de charger les patients avec rendez-vous" });
      return;
    }

    // Get patients already vaccinated today
    const { data: vaccinatedToday, error: vaccinationError } = await supabase
      .from("vaccinations")
      .select("patient_id")
      .eq("vaccination_date", today);

    if (vaccinationError) {
      toast({ title: "Erreur", description: "Impossible de vérifier les vaccinations du jour" });
      return;
    }

    // Filter out already vaccinated patients and remove duplicates
    const vaccinatedPatientIds = new Set(vaccinatedToday?.map(v => v.patient_id) || []);
    const uniquePatients = new Map();
    
    patientsWithAppointments?.forEach(appointment => {
      const patient = appointment.patients;
      if (patient && !vaccinatedPatientIds.has(patient.id)) {
        uniquePatients.set(patient.id, patient);
      }
    });

    // Convert to array and sort alphabetically
    const filteredPatients = Array.from(uniquePatients.values()).sort((a, b) => 
      a.last_name.localeCompare(b.last_name)
    );

    setPatients(filteredPatients);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("vaccine_inventory")
      .select("*")
      .gt("vials_count", "vials_used")
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
      // Update inventory (increment vials used)
      await supabase
        .from("vaccine_inventory")
        .update({ vials_used: selectedInventoryItem.vials_used + 1 })
        .eq("id", selectedInventoryItem.id);

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
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.last_name} {patient.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      {item.lot_number} - Exp: {item.expiry_date} ({item.vials_count - item.vials_used} restants)
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des Vaccinations
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {vaccinations.map((vaccination) => (
                <TableRow key={vaccination.id}>
                  <TableCell>{format(new Date(vaccination.vaccination_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{vaccination.vaccination_time}</TableCell>
                  <TableCell>
                    {vaccination.patients?.last_name} {vaccination.patients?.first_name}
                  </TableCell>
                  <TableCell>{vaccination.lot_number}</TableCell>
                  <TableCell>{vaccination.expiry_date}</TableCell>
                  
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