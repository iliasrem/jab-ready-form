import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Calendar, User, Syringe } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VaccineReservation {
  id: string;
  reservation_date: string;
  is_called: boolean;
  notes: string | null;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  };
  vaccines: {
    id: string;
    name: string;
    description: string | null;
  };
}

export const VaccineReservationsList = () => {
  const [reservations, setReservations] = useState<VaccineReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("vaccine_reservations")
        .select(`
          id,
          reservation_date,
          is_called,
          notes,
          patients (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          vaccines (
            id,
            name,
            description
          )
        `)
        .order("reservation_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCalled = async (reservationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("vaccine_reservations")
        .update({ is_called: !currentStatus })
        .eq("id", reservationId);

      if (error) throw error;

      toast.success(
        !currentStatus ? "Patient marqué comme appelé" : "Patient marqué comme non appelé"
      );
      
      // Update local state
      setReservations(prev =>
        prev.map(reservation =>
          reservation.id === reservationId
            ? { ...reservation, is_called: !currentStatus }
            : reservation
        )
      );
    } catch (error) {
      console.error("Error updating call status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const notCalledCount = reservations.filter(r => !r.is_called).length;
  const calledCount = reservations.filter(r => r.is_called).length;

  if (isLoading) {
    return <div className="p-6">Chargement des réservations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reservations.length}</div>
            <p className="text-sm text-muted-foreground">Total réservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{notCalledCount}</div>
            <p className="text-sm text-muted-foreground">À appeler</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{calledCount}</div>
            <p className="text-sm text-muted-foreground">Appelés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Liste des Réservations de Vaccins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <Syringe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune réservation de vaccin pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    reservation.is_called ? 'bg-green-50 border-green-200' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-bold capitalize">
                            {reservation.patients.first_name} {reservation.patients.last_name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{reservation.vaccines.name}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(reservation.reservation_date), "dd/MM/yyyy", { locale: fr })}
                          </span>
                        </div>

                        {reservation.patients.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`tel:${reservation.patients.phone}`}
                              className="hover:underline text-lg font-bold text-primary"
                            >
                              {reservation.patients.phone}
                            </a>
                          </div>
                        )}

                        {reservation.patients.email && (
                          <span className="text-sm text-muted-foreground">{reservation.patients.email}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`called-${reservation.id}`}
                        checked={reservation.is_called}
                        onCheckedChange={() => handleToggleCalled(reservation.id, reservation.is_called)}
                      />
                      <label
                        htmlFor={`called-${reservation.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {reservation.is_called ? "Appelé" : "À appeler"}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};