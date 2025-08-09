import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VaccineAdministration {
  id: string;
  date: string;
  time: string;
  lot_number: string;
  patient_first_name: string;
  patient_last_name: string;
  created_at: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface VaccineStock {
  lot_number: string;
}

export const VaccineAdministration = () => {
  const { toast } = useToast();
  const [administrations, setAdministrations] = useState<VaccineAdministration[]>([]);
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [availableLots, setAvailableLots] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    lot_number: '',
    patient_selection: '',
    patient_first_name: '',
    patient_last_name: '',
    use_manual_patient: false
  });

  // Auto-update time every minute
  useEffect(() => {
    const updateTime = () => {
      setFormData(prev => ({
        ...prev,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }));
    };
    
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadAdministrations();
    loadTodayPatients();
    loadAvailableLots();
  }, []);

  const loadAdministrations = async () => {
    try {
      // Cette table n'existe pas encore, on simulera avec des données locales pour le moment
      const storedData = localStorage.getItem('vaccine-administrations');
      if (storedData) {
        setAdministrations(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des administrations:', error);
    }
  };

  const loadTodayPatients = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          patients (
            id,
            first_name,
            last_name
          )
        `)
        .eq('appointment_date', today);

      if (error) throw error;

      const uniquePatients = data?.reduce((acc: Patient[], appointment) => {
        const patient = appointment.patients as unknown as Patient;
        if (patient && !acc.find(p => p.id === patient.id)) {
          acc.push(patient);
        }
        return acc;
      }, []) || [];

      setTodayPatients(uniquePatients);
    } catch (error) {
      console.error('Erreur lors du chargement des patients du jour:', error);
    }
  };

  const loadAvailableLots = async () => {
    try {
      // On récupère les 2 derniers numéros de lot du stock
      const storedStock = localStorage.getItem('vaccine-stock');
      if (storedStock) {
        const stock: VaccineStock[] = JSON.parse(storedStock);
        const sortedLots = stock
          .map(item => item.lot_number)
          .filter((lot, index, self) => self.indexOf(lot) === index) // Remove duplicates
          .slice(-2); // Get last 2
        setAvailableLots(sortedLots.reverse()); // Most recent first
      }
    } catch (error) {
      console.error('Erreur lors du chargement des lots:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAdministration: VaccineAdministration = {
      id: editingId || crypto.randomUUID(),
      date: formData.date,
      time: formData.time,
      lot_number: formData.lot_number,
      patient_first_name: formData.use_manual_patient ? formData.patient_first_name : getSelectedPatientName().first,
      patient_last_name: formData.use_manual_patient ? formData.patient_last_name : getSelectedPatientName().last,
      created_at: new Date().toISOString()
    };

    if (editingId) {
      const updatedAdministrations = administrations.map(admin => 
        admin.id === editingId ? newAdministration : admin
      );
      setAdministrations(updatedAdministrations);
      localStorage.setItem('vaccine-administrations', JSON.stringify(updatedAdministrations));
      setEditingId(null);
      toast({ title: "Administration modifiée avec succès" });
    } else {
      const newAdministrations = [...administrations, newAdministration];
      setAdministrations(newAdministrations);
      localStorage.setItem('vaccine-administrations', JSON.stringify(newAdministrations));
      toast({ title: "Vaccination enregistrée avec succès" });
    }

    resetForm();
  };

  const getSelectedPatientName = () => {
    const patient = todayPatients.find(p => p.id === formData.patient_selection);
    return patient ? { first: patient.first_name, last: patient.last_name } : { first: '', last: '' };
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      lot_number: '',
      patient_selection: '',
      patient_first_name: '',
      patient_last_name: '',
      use_manual_patient: false
    });
  };

  const handleEdit = (administration: VaccineAdministration) => {
    setFormData({
      date: administration.date,
      time: administration.time,
      lot_number: administration.lot_number,
      patient_selection: '',
      patient_first_name: administration.patient_first_name,
      patient_last_name: administration.patient_last_name,
      use_manual_patient: true
    });
    setEditingId(administration.id);
  };

  const handleDelete = (id: string) => {
    const updatedAdministrations = administrations.filter(admin => admin.id !== id);
    setAdministrations(updatedAdministrations);
    localStorage.setItem('vaccine-administrations', JSON.stringify(updatedAdministrations));
    toast({ title: "Administration supprimée" });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Gestion des Vaccinations</h2>
        <p className="text-muted-foreground">Encoder les vaccins administrés aux patients</p>
      </div>

      {/* Formulaire d'ajout/modification */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Modifier' : 'Nouvelle'} vaccination</CardTitle>
          <CardDescription>
            Enregistrer les détails de la vaccination administrée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="time">Heure (Live)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lot_number">Numéro de lot</Label>
              <Select value={formData.lot_number} onValueChange={(value) => setFormData(prev => ({ ...prev, lot_number: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lot ou saisir manuellement" />
                </SelectTrigger>
                <SelectContent>
                  {availableLots.map((lot) => (
                    <SelectItem key={lot} value={lot}>{lot}</SelectItem>
                  ))}
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                </SelectContent>
              </Select>
              {formData.lot_number === 'manual' && (
                <Input
                  className="mt-2"
                  placeholder="Numéro de lot"
                  value={formData.lot_number === 'manual' ? '' : formData.lot_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, lot_number: e.target.value }))}
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="manual_patient"
                  checked={formData.use_manual_patient}
                  onChange={(e) => setFormData(prev => ({ ...prev, use_manual_patient: e.target.checked }))}
                />
                <Label htmlFor="manual_patient" className="text-sm">Saisie manuelle</Label>
              </div>
              
              {!formData.use_manual_patient ? (
                <Select value={formData.patient_selection} onValueChange={(value) => setFormData(prev => ({ ...prev, patient_selection: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un patient du jour" />
                  </SelectTrigger>
                  <SelectContent>
                    {todayPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Prénom"
                    value={formData.patient_first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, patient_first_name: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Nom"
                    value={formData.patient_last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, patient_last_name: e.target.value }))}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" />
                {editingId ? 'Modifier' : 'Enregistrer'} la vaccination
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Liste des vaccinations */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des vaccinations</CardTitle>
          <CardDescription>
            Liste des vaccins administrés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>N° Lot</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {administrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune vaccination enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                administrations.map((administration) => (
                  <TableRow key={administration.id}>
                    <TableCell>
                      {format(new Date(administration.date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{administration.time}</TableCell>
                    <TableCell>{administration.lot_number}</TableCell>
                    <TableCell>
                      {administration.patient_first_name} {administration.patient_last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(administration)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(administration.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};