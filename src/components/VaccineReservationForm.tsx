import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, UserPlus } from "lucide-react";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface Vaccine {
  id: string;
  name: string;
  description: string | null;
}

interface VaccineReservationFormProps {
  onReservationCreated?: () => void;
}

export const VaccineReservationForm = ({ onReservationCreated }: VaccineReservationFormProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedVaccineId, setSelectedVaccineId] = useState<string>("");
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [newPatientFirstName, setNewPatientFirstName] = useState("");
  const [newPatientLastName, setNewPatientLastName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchVaccines();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, phone")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Error fetching patients:", error);
      return;
    }
    setPatients(data || []);
  };

  const fetchVaccines = async () => {
    const { data, error } = await supabase
      .from("vaccines")
      .select("id, name, description")
      .eq("is_available", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching vaccines:", error);
      return;
    }
    setVaccines(data || []);
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.last_name} ${patient.first_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleCreateNewPatient = async () => {
    if (!newPatientFirstName.trim() || !newPatientLastName.trim() || !newPatientPhone.trim()) {
      toast.error("Veuillez remplir tous les champs du nouveau patient");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          first_name: newPatientFirstName.trim(),
          last_name: newPatientLastName.trim(),
          phone: newPatientPhone.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Patient créé avec succès");
      setSelectedPatientId(data.id);
      setIsCreatingNewPatient(false);
      setNewPatientFirstName("");
      setNewPatientLastName("");
      setNewPatientPhone("");
      fetchPatients();
    } catch (error) {
      console.error("Error creating patient:", error);
      toast.error("Erreur lors de la création du patient");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedVaccineId) {
      toast.error("Veuillez sélectionner un patient et un vaccin");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("vaccine_reservations")
        .insert({
          patient_id: selectedPatientId,
          vaccine_id: selectedVaccineId,
          reservation_date: new Date().toISOString().split("T")[0],
        });

      if (error) throw error;

      toast.success("Réservation enregistrée avec succès");
      setSelectedPatientId("");
      setSelectedVaccineId("");
      setSearchTerm("");
      onReservationCreated?.();
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Erreur lors de l'enregistrement de la réservation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nouvelle Réservation de Vaccin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Patient</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingNewPatient(!isCreatingNewPatient)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreatingNewPatient ? "Annuler" : "Nouveau patient"}
            </Button>
          </div>

          {isCreatingNewPatient ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={newPatientLastName}
                    onChange={(e) => setNewPatientLastName(e.target.value)}
                    placeholder="Nom de famille"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={newPatientFirstName}
                    onChange={(e) => setNewPatientFirstName(e.target.value)}
                    placeholder="Prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="Numéro de téléphone"
                  />
                </div>
              </div>
              <Button onClick={handleCreateNewPatient} disabled={isLoading}>
                Créer le patient
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.last_name.toUpperCase()} {patient.first_name}
                      {patient.phone && ` - ${patient.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Vaccine Selection */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Vaccin</Label>
          <Select value={selectedVaccineId} onValueChange={setSelectedVaccineId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un vaccin" />
            </SelectTrigger>
            <SelectContent>
              {vaccines.map((vaccine) => (
                <SelectItem key={vaccine.id} value={vaccine.id}>
                  {vaccine.name}
                  {vaccine.description && ` - ${vaccine.description}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !selectedPatientId || !selectedVaccineId}
          className="w-full"
        >
          Enregistrer la réservation
        </Button>
      </CardContent>
    </Card>
  );
};
