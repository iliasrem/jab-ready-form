import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareAsc } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export interface Appointment {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  date: string; // ISO date string
  time: string;
  notes?: string;
  status: "confirmed" | "pending" | "cancelled";
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
    notes: "Première dose",
    status: "confirmed",
    createdAt: "2024-08-10T10:30:00Z"
  },
  {
    id: "2",
    firstName: "Pierre",
    lastName: "Martin",
    email: "pierre.martin@email.com",
    date: "2024-08-15",
    time: "10:30",
    status: "pending",
    createdAt: "2024-08-12T14:20:00Z"
  },
  {
    id: "3",
    firstName: "Sophie",
    lastName: "Bernard",
    phone: "0987654321",
    date: "2024-08-16",
    time: "14:15",
    notes: "Rappel",
    status: "confirmed",
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
    status: "cancelled",
    createdAt: "2024-08-08T16:45:00Z"
  },
  {
    id: "5",
    firstName: "Claire",
    lastName: "Dubois",
    email: "claire.dubois@email.com",
    date: "2024-08-17",
    time: "11:30",
    status: "pending",
    createdAt: "2024-08-13T11:10:00Z"
  },
  {
    id: "6",
    firstName: "Marc",
    lastName: "Leroy",
    phone: "0567891234",
    date: "2024-08-18",
    time: "15:45",
    notes: "Consultation préalable nécessaire",
    status: "confirmed",
    createdAt: "2024-08-12T13:30:00Z"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed":
      return <CheckCircle className="h-4 w-4" />;
    case "pending":
      return <AlertCircle className="h-4 w-4" />;
    case "cancelled":
      return <XCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Confirmé";
    case "pending":
      return "En attente";
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
};

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");

  useEffect(() => {
    // Dans une vraie application, vous récupéreriez les données depuis le backend
    const sortedAppointments = [...mockAppointments].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return compareAsc(dateTimeA, dateTimeB);
    });
    setAppointments(sortedAppointments);
  }, []);

  const filteredAppointments = appointments.filter(apt => 
    filter === "all" || apt.status === filter
  );

  const updateAppointmentStatus = (id: string, newStatus: "confirmed" | "pending" | "cancelled") => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === id ? { ...apt, status: newStatus } : apt
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Liste des Rendez-vous</span>
          </CardTitle>
          <CardDescription>
            Gérez tous les rendez-vous triés par date et heure. Total : {filteredAppointments.length} rendez-vous
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex space-x-2 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Tous ({appointments.length})
            </Button>
            <Button
              variant={filter === "confirmed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("confirmed")}
            >
              Confirmés ({appointments.filter(a => a.status === "confirmed").length})
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              En attente ({appointments.filter(a => a.status === "pending").length})
            </Button>
            <Button
              variant={filter === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("cancelled")}
            >
              Annulés ({appointments.filter(a => a.status === "cancelled").length})
            </Button>
          </div>

          {/* Table des rendez-vous */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
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
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(appointment.status)}
                            <span>{getStatusLabel(appointment.status)}</span>
                          </div>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.notes && (
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-32" title={appointment.notes}>
                            {appointment.notes}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {appointment.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                            className="text-xs"
                          >
                            Confirmer
                          </Button>
                        )}
                        {appointment.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rendez-vous trouvé</h3>
              <p className="text-muted-foreground">
                {filter === "all" 
                  ? "Il n'y a actuellement aucun rendez-vous planifié." 
                  : `Aucun rendez-vous avec le statut "${getStatusLabel(filter)}".`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}