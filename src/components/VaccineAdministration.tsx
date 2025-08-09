import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Trash2, Plus, Printer, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

  // Print date range state
  const [printDateRange, setPrintDateRange] = useState({
    from: undefined as Date | undefined,
    to: undefined as Date | undefined
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

  const getFilteredAdministrations = () => {
    if (!printDateRange.from && !printDateRange.to) {
      return administrations;
    }

    return administrations.filter(admin => {
      const adminDate = new Date(admin.date);
      const fromDate = printDateRange.from;
      const toDate = printDateRange.to;

      if (fromDate && toDate) {
        return adminDate >= fromDate && adminDate <= toDate;
      } else if (fromDate) {
        return adminDate >= fromDate;
      } else if (toDate) {
        return adminDate <= toDate;
      }
      return true;
    });
  };

  const handlePrintReport = () => {
    const filteredData = getFilteredAdministrations();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateRangeText = printDateRange.from && printDateRange.to
      ? `du ${format(printDateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(printDateRange.to, 'dd/MM/yyyy', { locale: fr })}`
      : printDateRange.from
      ? `à partir du ${format(printDateRange.from, 'dd/MM/yyyy', { locale: fr })}`
      : printDateRange.to
      ? `jusqu'au ${format(printDateRange.to, 'dd/MM/yyyy', { locale: fr })}`
      : 'toutes les dates';

    const printContent = `
      <html>
        <head>
          <title>Rapport des Vaccinations</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            h2 { color: #666; font-size: 16px; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Rapport des Vaccinations</h1>
          <h2>Période: ${dateRangeText}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>N° Lot</th>
                <th>Patient</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(admin => `
                <tr>
                  <td>${format(new Date(admin.date), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td>${admin.time}</td>
                  <td>${admin.lot_number}</td>
                  <td>${admin.patient_first_name} ${admin.patient_last_name}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Rapport généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
            <p>Total: ${filteredData.length} vaccination(s)</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Historique des vaccinations</CardTitle>
              <CardDescription>
                Liste des vaccins administrés
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !printDateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {printDateRange.from ? format(printDateRange.from, "dd/MM/yyyy", { locale: fr }) : "Date début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={printDateRange.from}
                      onSelect={(date) => setPrintDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !printDateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {printDateRange.to ? format(printDateRange.to, "dd/MM/yyyy", { locale: fr }) : "Date fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={printDateRange.to}
                      onSelect={(date) => setPrintDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button onClick={handlePrintReport} size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
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
              {getFilteredAdministrations().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {administrations.length === 0 ? "Aucune vaccination enregistrée" : "Aucune vaccination dans cette période"}
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredAdministrations().map((administration) => (
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