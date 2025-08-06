import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastAppointment: Date | null;
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
    lastAppointment: new Date("2024-01-15"),
    nextAppointment: new Date("2024-02-15"),
    notes: "Regular checkup patient",
    status: "Active"
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "+1234567891",
    lastAppointment: new Date("2024-01-20"),
    nextAppointment: null,
    notes: "Consultation completed",
    status: "Active"
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.johnson@email.com",
    phone: "+1234567892",
    lastAppointment: null,
    nextAppointment: new Date("2024-02-10"),
    notes: "New patient",
    status: "Active"
  },
  {
    id: "4",
    name: "Sarah Wilson",
    email: "sarah.wilson@email.com",
    phone: "+1234567893",
    lastAppointment: new Date("2023-12-10"),
    nextAppointment: null,
    notes: "Treatment series completed",
    status: "Inactive"
  }
];

export function PatientList() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedPatient, setEditedPatient] = useState<Patient | null>(null);

  const startEditing = (patient: Patient) => {
    setEditingId(patient.id);
    setEditedPatient({ ...patient });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedPatient(null);
  };

  const saveChanges = () => {
    if (!editedPatient) return;

    setPatients(prev => 
      prev.map(patient => 
        patient.id === editedPatient.id ? editedPatient : patient
      )
    );

    toast({
      title: "Patient Updated",
      description: `${editedPatient.name}'s information has been updated successfully.`,
    });

    setEditingId(null);
    setEditedPatient(null);
  };

  const deletePatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    setPatients(prev => prev.filter(p => p.id !== patientId));
    
    toast({
      title: "Patient Removed",
      description: `${patient.name} has been removed from the patient list.`,
    });
  };

  const updateEditedField = (field: keyof Patient, value: any) => {
    if (!editedPatient) return;
    setEditedPatient({ ...editedPatient, [field]: value });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Patient Management</CardTitle>
        <CardDescription>
          View and edit patient details. Click the edit icon to modify information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Last Visit</th>
                <th className="text-left p-3 font-medium">Next Appointment</th>
                <th className="text-left p-3 font-medium">Status</th>
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

                  {/* Last Visit */}
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {patient.lastAppointment 
                        ? format(patient.lastAppointment, "MMM d, yyyy")
                        : "Never"
                      }
                    </span>
                  </td>

                  {/* Next Appointment */}
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {patient.nextAppointment 
                        ? format(patient.nextAppointment, "MMM d, yyyy")
                        : "None scheduled"
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