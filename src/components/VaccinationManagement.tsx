import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface VaccineInventory {
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
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedLotNumber, setSelectedLotNumber] = useState("");
  const [vaccinationDate, setVaccinationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vaccinationTime, setVaccinationTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState("");
  const [isAddPatientDialogOpen, setIsAddPatientDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    fetchVaccinations();
    fetchPatients();
    fetchInventory();
  }, []);

  const fetchVaccinations = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccinations')
        .select(`
          *,
          patients:patient_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('vaccination_date', { ascending: false })
        .order('vaccination_time', { ascending: false });

      if (error) throw error;
      setVaccinations(data || []);
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les vaccinations",
        variant: "destructive",
      });
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active')
        .order('last_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .gt('vials_count', 'vials_used')
        .order('expiry_date');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleAddPatient = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          email: newPatient.email || null,
          phone: newPatient.phone || null,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      setPatients([...patients, data]);
      setSelectedPatientId(data.id);
      setNewPatient({ first_name: "", last_name: "", email: "", phone: "" });
      setIsAddPatientDialogOpen(false);
      
      toast({
        title: "Patient ajouté",
        description: "Le patient a été ajouté avec succès",
      });
    } catch (error) {
      console.error('Error adding patient:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le patient",
        variant: "destructive",
      });
    }
  };

  const handleAddVaccination = async () => {
    if (!selectedPatientId || !selectedLotNumber) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un patient et un lot de vaccin",
        variant: "destructive",
      });
      return;
    }

    const selectedInventoryItem = inventory.find(item => item.lot_number === selectedLotNumber);
    if (!selectedInventoryItem) {
      toast({
        title: "Erreur",
        description: "Lot de vaccin introuvable",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vaccinations')
        .insert([{
          patient_id: selectedPatientId,
          vaccination_date: vaccinationDate,
          vaccination_time: vaccinationTime,
          lot_number: selectedLotNumber,
          expiry_date: selectedInventoryItem.expiry_date,
          notes: notes || null
        }]);

      if (error) throw error;

      // Update vaccine inventory
      await supabase
        .from('vaccine_inventory')
        .update({ 
          vials_used: selectedInventoryItem.vials_used + 1 
        })
        .eq('id', selectedInventoryItem.id);

      // Reset form
      setSelectedPatientId("");
      setSelectedLotNumber("");
      setVaccinationDate(format(new Date(), 'yyyy-MM-dd'));
      setVaccinationTime(format(new Date(), 'HH:mm'));
      setNotes("");

      // Refresh data
      fetchVaccinations();
      fetchInventory();

      toast({
        title: "Vaccination enregistrée",
        description: "La vaccination a été enregistrée avec succès",
      });
    } catch (error) {
      console.error('Error adding vaccination:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la vaccination",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVaccination = async (vaccinationId: string, lotNumber: string) => {
    try {
      const { error } = await supabase
        .from('vaccinations')
        .delete()
        .eq('id', vaccinationId);

      if (error) throw error;

      // Update vaccine inventory (decrease vials_used)
      const inventoryItem = inventory.find(item => item.lot_number === lotNumber);
      if (inventoryItem) {
        await supabase
          .from('vaccine_inventory')
          .update({ 
            vials_used: Math.max(0, inventoryItem.vials_used - 1) 
          })
          .eq('lot_number', lotNumber);
      }

      fetchVaccinations();
      fetchInventory();

      toast({
        title: "Vaccination supprimée",
        description: "La vaccination a été supprimée avec succès",
      });
    } catch (error) {
      console.error('Error deleting vaccination:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la vaccination",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Vaccination</CardTitle>
          <CardDescription>Enregistrer une nouvelle vaccination</CardDescription>
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
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isAddPatientDialogOpen} onOpenChange={setIsAddPatientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un nouveau patient</DialogTitle>
                      <DialogDescription>
                        Saisissez les informations du nouveau patient
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          value={newPatient.first_name}
                          onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                          placeholder="Prénom"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          value={newPatient.last_name}
                          onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                          placeholder="Nom de famille"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newPatient.email}
                          onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                          placeholder="Email (optionnel)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          value={newPatient.phone}
                          onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                          placeholder="Téléphone (optionnel)"
                        />
                      </div>
                      <Button onClick={handleAddPatient} className="w-full">
                        Ajouter le patient
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={vaccinationDate}
                onChange={(e) => setVaccinationDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                value={vaccinationTime}
                onChange={(e) => setVaccinationTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          <Button onClick={handleAddVaccination} className="w-full">
            Enregistrer la vaccination
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des vaccinations</CardTitle>
          <CardDescription>Liste des vaccinations effectuées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vaccinations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune vaccination enregistrée
              </p>
            ) : (
              vaccinations.map((vaccination) => (
                <div key={vaccination.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-semibold">
                        {vaccination.patients.first_name} {vaccination.patients.last_name}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {vaccination.vaccination_date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {vaccination.vaccination_time}
                        </div>
                      </div>
                      <div className="text-sm">
                        <strong>Lot:</strong> {vaccination.lot_number} - 
                        <strong> Exp:</strong> {vaccination.expiry_date}
                      </div>
                      {vaccination.notes && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Notes:</strong> {vaccination.notes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVaccination(vaccination.id, vaccination.lot_number)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};