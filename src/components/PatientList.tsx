import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Trash2, Upload, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date | null;
  nextAppointment: Date | null;
  notes: string;
  status: "Active" | "Inactive";
}

// Mock patient data
const mockPatients: Patient[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1234567890",
    birthDate: new Date("1985-03-15"),
    nextAppointment: new Date("2024-02-15"),
    notes: "Regular checkup patient",
    status: "Active"
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "+1234567891",
    birthDate: new Date("1990-07-22"),
    nextAppointment: null,
    notes: "Consultation completed",
    status: "Active"
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.johnson@email.com",
    phone: "+1234567892",
    birthDate: new Date("1978-11-08"),
    nextAppointment: new Date("2024-02-10"),
    notes: "New patient",
    status: "Active"
  },
  {
    id: "4",
    name: "Sarah Wilson",
    email: "sarah.wilson@email.com",
    phone: "+1234567893",
    birthDate: new Date("1982-09-14"),
    nextAppointment: null,
    notes: "Treatment series completed",
    status: "Inactive"
  }
];

export function PatientList() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedPatient, setEditedPatient] = useState<Patient | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPatients = async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, phone, birth_date, status, notes')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des patients:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des patients.",
          variant: "destructive",
        });
        return;
      }

      const mapped: Patient[] = (data ?? []).map((p: any) => ({
        id: p.id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
        email: p.email ?? "",
        phone: p.phone ?? "",
        birthDate: p.birth_date ? new Date(p.birth_date) : null,
        nextAppointment: null,
        notes: p.notes ?? "",
        status: (p.status === 'inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
      }));

      setPatients(mapped);
    };

    loadPatients();
  }, []);

  const startEditing = (patient: Patient) => {
    setEditingId(patient.id);
    setEditedPatient({ ...patient });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedPatient(null);
  };

  const saveChanges = async () => {
    if (!editedPatient) return;

    try {
      // Split name into first_name and last_name
      const nameParts = editedPatient.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error } = await supabase
        .from('patients')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: editedPatient.email,
          phone: editedPatient.phone,
          birth_date: editedPatient.birthDate ? editedPatient.birthDate.toISOString().split('T')[0] : null,
          status: editedPatient.status.toLowerCase() as 'active' | 'inactive',
          notes: editedPatient.notes
        })
        .eq('id', editedPatient.id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le patient.",
          variant: "destructive",
        });
        return;
      }

      setPatients(prev => 
        prev.map(patient => 
          patient.id === editedPatient.id ? editedPatient : patient
        )
      );

      toast({
        title: "Patient mis à jour",
        description: `Les informations de ${editedPatient.name} ont été mises à jour avec succès.`,
      });

      setEditingId(null);
      setEditedPatient(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const deletePatient = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${patient.name} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le patient.",
          variant: "destructive",
        });
        return;
      }

      setPatients(prev => prev.filter(p => p.id !== patientId));
      
      toast({
        title: "Patient supprimé",
        description: `${patient.name} a été supprimé de la liste.`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    }
  };

  const updateEditedField = (field: keyof Patient, value: any) => {
    if (!editedPatient) return;
    setEditedPatient({ ...editedPatient, [field]: value });
  };

  const exportToExcel = () => {
    const exportData = patients.map(patient => ({
      Nom: patient.name,
      Email: patient.email,
      Téléphone: patient.phone,
      "Date de naissance": patient.birthDate ? format(patient.birthDate, "dd/MM/yyyy") : "",
      "Prochain RDV": patient.nextAppointment ? format(patient.nextAppointment, "dd/MM/yyyy") : "",
      Statut: patient.status,
      Notes: patient.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "patients.xlsx");

    toast({
      title: "Export réussi",
      description: "La liste des patients a été exportée avec succès.",
    });
  };

  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedPatients: Patient[] = jsonData.map((row: any, index: number) => ({
          id: `imported-${Date.now()}-${index}`,
          name: row.Nom || row.Name || "",
          email: row.Email || "",
          phone: row.Téléphone || row.Phone || "",
          birthDate: row["Date de naissance"] || row.BirthDate ? new Date(row["Date de naissance"] || row.BirthDate) : null,
          nextAppointment: null,
          notes: row.Notes || "",
          status: "Active" as const
        }));

        setPatients(prev => [...prev, ...importedPatients]);

        toast({
          title: "Import réussi",
          description: `${importedPatients.length} patients ont été importés avec succès.`,
        });
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'a pas pu être traité. Vérifiez le format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Gestion des Patients</CardTitle>
            <CardDescription>
              Consultez et modifiez les détails des patients. Cliquez sur l'icône d'édition pour modifier les informations.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importFromExcel}
              ref={fileInputRef}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Téléphone</th>
                <th className="text-left p-3 font-medium">Date de naissance</th>
                <th className="text-left p-3 font-medium">Prochain RDV</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Notes</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-b hover:bg-muted/50">
                  {/* Name */}
                  <td className="p-3">
                    {editingId === patient.id ? (
                      <Input
                        value={editedPatient?.name || ""}
                        onChange={(e) => updateEditedField("name", e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <span className="font-medium">{patient.name}</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="p-3">
                    {editingId === patient.id ? (
                      <Input
                        type="email"
                        value={editedPatient?.email || ""}
                        onChange={(e) => updateEditedField("email", e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <span className="text-sm">{patient.email}</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="p-3">
                    {editingId === patient.id ? (
                      <Input
                        value={editedPatient?.phone || ""}
                        onChange={(e) => updateEditedField("phone", e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <span className="text-sm">{patient.phone}</span>
                    )}
                  </td>

                  {/* Birth Date */}
                  <td className="p-3">
                    {editingId === patient.id ? (
                      <Input
                        type="date"
                        value={editedPatient?.birthDate ? format(editedPatient.birthDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => updateEditedField("birthDate", e.target.value ? new Date(e.target.value) : null)}
                        className="w-full"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {patient.birthDate 
                          ? format(patient.birthDate, "dd/MM/yyyy")
                          : "Non renseigné"
                        }
                      </span>
                    )}
                  </td>

                  {/* Next Appointment */}
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {patient.nextAppointment 
                        ? format(patient.nextAppointment, "dd/MM/yyyy")
                        : "Aucun prévu"
                      }
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {editingId === patient.id ? (
                      <select
                        value={editedPatient?.status || "Active"}
                        onChange={(e) => updateEditedField("status", e.target.value as "Active" | "Inactive")}
                        className="w-full p-2 border border-input rounded-md bg-background"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    ) : (
                      <Badge variant={patient.status === "Active" ? "default" : "outline"}>
                        {patient.status}
                      </Badge>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="p-3 max-w-xs">
                    {editingId === patient.id ? (
                      <Input
                        value={editedPatient?.notes || ""}
                        onChange={(e) => updateEditedField("notes", e.target.value)}
                        className="w-full"
                        placeholder="Add notes..."
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground truncate block">
                        {patient.notes || "No notes"}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {editingId === patient.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={saveChanges}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(patient)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePatient(patient.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {patients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No patients found. Patient records will appear here as appointments are booked.
          </div>
        )}
      </CardContent>
    </Card>
  );
}