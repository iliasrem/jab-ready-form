import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareAsc } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Mail, FileText } from "lucide-react";

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

// Données mockées des rendez-vous
const mockAppointments: Appointment[] = [
  {
    id: "1",
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie.dupont@email.com",
    phone: "0123456789",
    date: "2024-08-15",
    time: "09:00",
    services: ["covid"],
    notes: "Première dose",
    createdAt: "2024-08-10T10:30:00Z"
  },
  {
    id: "2",
    firstName: "Pierre",
    lastName: "Martin",
    email: "pierre.martin@email.com",
    date: "2024-08-15",
    time: "10:30",
    services: ["grippe"],
    createdAt: "2024-08-12T14:20:00Z"
  },
  {
    id: "3",
    firstName: "Sophie",
    lastName: "Bernard",
    phone: "0987654321",
    date: "2024-08-16",
    time: "14:15",
    services: ["covid", "grippe"],
    notes: "Rappel",
    createdAt: "2024-08-11T09:15:00Z"
  },
  {
    id: "4",
    firstName: "Jean",
    lastName: "Moreau",
    email: "jean.moreau@email.com",
    phone: "0147258369",
    date: "2024-08-14",
    time: "16:00",
    services: ["covid"],
    createdAt: "2024-08-08T16:45:00Z"
  },
  {
    id: "5",
    firstName: "Claire",
    lastName: "Dubois",
    email: "claire.dubois@email.com",
    date: "2024-08-17",
    time: "11:30",
    services: ["grippe"],
    createdAt: "2024-08-13T11:10:00Z"
  },
  {
    id: "6",
    firstName: "Marc",
    lastName: "Leroy",
    phone: "0567891234",
    date: "2024-08-18",
    time: "15:45",
    services: ["covid", "grippe"],
    notes: "Consultation préalable nécessaire",
    createdAt: "2024-08-12T13:30:00Z"
  }
];


const serviceLabels: { [key: string]: string } = {
  covid: "Vaccin COVID",
  grippe: "Vaccin Grippe"
};

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Dans une vraie application, vous récupéreriez les données depuis le backend
    const sortedAppointments = [...mockAppointments].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return compareAsc(dateTimeA, dateTimeB);
    });
    setAppointments(sortedAppointments);
  }, []);

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

          {/* Table des rendez-vous */}
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

          {appointments.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rendez-vous trouvé</h3>
              <p className="text-muted-foreground">
                Il n'y a actuellement aucun rendez-vous planifié.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}