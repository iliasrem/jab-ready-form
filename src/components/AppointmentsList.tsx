import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareAsc } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Mail, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Appointment {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  date: string; // ISO date string
  time: string;
  services?: string[]; // Array of service IDs
  notes?: string;
  createdAt: string; // ISO date string
}

const serviceLabels: { [key: string]: string } = {
  covid: "Vaccin 2025-2026 contre le COVID",
  grippe: "Vaccin contre la grippe 2025-2026"
};

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des rendez-vous:', error);
        return;
      }

      const formattedAppointments: Appointment[] = data?.map(appointment => ({
        id: appointment.id,
        firstName: appointment.patients?.first_name || '',
        lastName: appointment.patients?.last_name || '',
        email: appointment.patients?.email || undefined,
        phone: appointment.patients?.phone || undefined,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        services: appointment.services || [],
        notes: appointment.notes || undefined,
        createdAt: appointment.created_at,
      })) || [];

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Liste des Rendez-vous</span>
          </CardTitle>
          <CardDescription>
            Gérez tous les rendez-vous triés par date et heure. Total : {appointments.length} rendez-vous
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Chargement des rendez-vous...</p>
            </div>
          )}
          
          {!loading && appointments.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rendez-vous trouvé</h3>
              <p className="text-muted-foreground">
                Il n'y a actuellement aucun rendez-vous planifié.
              </p>
            </div>
          )}

          {!loading && appointments.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {appointment.firstName} {appointment.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {appointment.id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {appointment.email && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{appointment.email}</span>
                            </div>
                          )}
                          {appointment.phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{appointment.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(parseISO(appointment.date), "EEEE d MMMM yyyy", { locale: fr })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.time}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {appointment.services && appointment.services.length > 0 && (
                          <div className="space-y-1">
                            {appointment.services.map((serviceId, index) => (
                              <div key={index} className="text-sm bg-primary/10 text-primary px-2 py-1 rounded inline-block mr-1">
                                {serviceLabels[serviceId] || serviceId}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {appointment.notes && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm" title={appointment.notes}>
                              {appointment.notes}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}