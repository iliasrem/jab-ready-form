import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, User, Syringe } from "lucide-react";

interface Vaccine {
  id: string;
  name: string;
  description: string | null;
}

export const VaccineReservation = () => {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    vaccineId: "",
    notes: ""
  });

  useEffect(() => {
    fetchAvailableVaccines();
  }, []);

  const fetchAvailableVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from("vaccines")
        .select("id, name, description")
        .eq("is_available", true)
        .order("name");

      if (error) throw error;
      setVaccines(data || []);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      toast.error("Erreur lors du chargement des vaccins");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, create the patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          email: formData.email || null,
          notes: formData.notes || null,
          user_id: null // Public booking
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      // Then, create the vaccine reservation
      const { error: reservationError } = await supabase
        .from("vaccine_reservations")
        .insert([{
          patient_id: patientData.id,
          vaccine_id: formData.vaccineId,
          notes: formData.notes || null
        }]);

      if (reservationError) throw reservationError;

      toast.success("Réservation de vaccin effectuée avec succès !");
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        vaccineId: "",
        notes: ""
      });

    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Erreur lors de la réservation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Réservation de Vaccin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Votre numéro de téléphone"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vaccine">Vaccin souhaité *</Label>
              <Select value={formData.vaccineId} onValueChange={(value) => setFormData({ ...formData, vaccineId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un vaccin" />
                </SelectTrigger>
                <SelectContent>
                  {vaccines.map((vaccine) => (
                    <SelectItem key={vaccine.id} value={vaccine.id}>
                      <div>
                        <div className="font-medium">{vaccine.name}</div>
                        {vaccine.description && (
                          <div className="text-sm text-muted-foreground">{vaccine.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !formData.firstName || !formData.lastName || !formData.vaccineId}
              className="w-full"
            >
              {isLoading ? "Réservation en cours..." : "Réserver le vaccin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};