import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, isBefore, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Mail, FileText, Edit, Trash2, Save, X, History, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeForDisplay } from "@/lib/utils";

export interface Appointment {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  date: string; // ISO date string
  time: string;
  services?: ("covid" | "grippe")[]; // Array of service IDs
  notes?: string;
  createdAt: string; // ISO date string
}

const serviceLabels: { [key: string]: string } = {
  covid: "Vaccin 2025-2026 contre le COVID",
  grippe: "Vaccin contre la grippe 2025-2026"
};

export function AppointmentsList() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedAppointment, setEditedAppointment] = useState<Partial<Appointment> | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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

  const startEditing = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setEditedAppointment({ ...appointment });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedAppointment(null);
  };

  const saveChanges = async () => {
    if (!editedAppointment || !editingId) return;

    try {
      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          appointment_date: editedAppointment.date,
          appointment_time: editedAppointment.time,
          services: editedAppointment.services,
          notes: editedAppointment.notes,
        })
        .eq('id', editingId);

      if (appointmentError) {
        console.error('Erreur lors de la mise à jour du rendez-vous:', appointmentError);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le rendez-vous.",
          variant: "destructive",
        });
        return;
      }

      // Update patient info if changed
      const appointment = appointments.find(a => a.id === editingId);
      if (appointment && (
        editedAppointment.firstName !== appointment.firstName ||
        editedAppointment.lastName !== appointment.lastName ||
        editedAppointment.email !== appointment.email ||
        editedAppointment.phone !== appointment.phone
      )) {
        const { error: patientError } = await supabase
          .from('patients')
          .update({
            first_name: editedAppointment.firstName,
            last_name: editedAppointment.lastName,
            email: editedAppointment.email,
            phone: editedAppointment.phone,
          })
          .eq('id', (await supabase.from('appointments').select('patient_id').eq('id', editingId).single()).data?.patient_id);

        if (patientError) {
          console.error('Erreur lors de la mise à jour du patient:', patientError);
        }
      }

      // Refresh appointments list
      fetchAppointments();
      
      toast({
        title: "Rendez-vous mis à jour",
        description: "Les informations du rendez-vous ont été mises à jour avec succès.",
      });

      setEditingId(null);
      setEditedAppointment(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le rendez-vous de ${appointment.firstName} ${appointment.lastName} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('Erreur lors de la suppression du rendez-vous:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le rendez-vous.",
          variant: "destructive",
        });
        return;
      }

      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
      
      toast({
        title: "Rendez-vous supprimé",
        description: `Le rendez-vous de ${appointment.firstName} ${appointment.lastName} a été supprimé.`,
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

  const updateEditedField = (field: keyof Appointment, value: any) => {
    if (!editedAppointment) return;
    setEditedAppointment({ ...editedAppointment, [field]: value });
  };

  // Séparer les rendez-vous passés et futurs
  const today = startOfToday();
  const now = new Date();
  
  const upcomingAppointments = appointments.filter(appointment => {
    const appointmentDate = parseISO(appointment.date);
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    return !isBefore(appointmentDateTime, now);
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return compareAsc(dateA, dateB);
  });

  // Grouper les rendez-vous à venir par jour
  const upcomingByDay = upcomingAppointments.reduce((acc, appointment) => {
    const date = appointment.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const pastAppointments = appointments.filter(appointment => {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    return isBefore(appointmentDateTime, now);
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return compareAsc(dateB, dateA); // Plus récents en premier
  });

  const renderAppointmentRow = (appointment: Appointment, isCompact = false) => (
    <TableRow key={appointment.id}>
      <TableCell>
        <div className="flex items-center space-x-2">
          <User className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
          <div className="space-y-1">
            {editingId === appointment.id ? (
              <div className="space-y-1">
                <Input
                  value={editedAppointment?.firstName || ""}
                  onChange={(e) => updateEditedField("firstName", e.target.value)}
                  placeholder="Prénom"
                  className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
                />
                <Input
                  value={editedAppointment?.lastName || ""}
                  onChange={(e) => updateEditedField("lastName", e.target.value)}
                  placeholder="Nom"
                  className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
                />
              </div>
            ) : (
              <>
                <div className={`font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {appointment.firstName} {appointment.lastName}
                </div>
                {!isCompact && (
                  <div className="text-xs text-muted-foreground">
                    ID: {appointment.id}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {editingId === appointment.id ? (
          <div className="space-y-1">
            <Input
              type="email"
              value={editedAppointment?.email || ""}
              onChange={(e) => updateEditedField("email", e.target.value)}
              placeholder="Email"
              className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
            />
            <Input
              value={editedAppointment?.phone || ""}
              onChange={(e) => updateEditedField("phone", e.target.value)}
              placeholder="Téléphone"
              className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
            />
          </div>
        ) : (
          <div className="space-y-1">
            {appointment.email && (
              <div className={`flex items-center space-x-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                <Mail className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-muted-foreground`} />
                <span>{appointment.email}</span>
              </div>
            )}
            {appointment.phone && (
              <div className={`flex items-center space-x-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                <Phone className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-muted-foreground`} />
                <span>{appointment.phone}</span>
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Clock className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
          <div className="space-y-1">
            {editingId === appointment.id ? (
              <div className="space-y-1">
                <Input
                  type="date"
                  value={editedAppointment?.date || ""}
                  onChange={(e) => updateEditedField("date", e.target.value)}
                  className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
                />
                <Input
                  type="time"
                  value={editedAppointment?.time || ""}
                  onChange={(e) => updateEditedField("time", e.target.value)}
                  className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}
                />
              </div>
            ) : (
              <>
                <div className={`font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {format(parseISO(appointment.date), "EEEE d MMMM yyyy", { locale: fr })}
                </div>
                <div className={`${isCompact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                   {formatTimeForDisplay(appointment.time)}
                  </div>
              </>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {editingId === appointment.id ? (
          <Select 
            value={editedAppointment?.services?.[0] || ""}
            onValueChange={(value) => updateEditedField("services", [value])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner un service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="covid">Vaccin 2025-2026 contre le COVID</SelectItem>
              <SelectItem value="grippe">Vaccin contre la grippe 2025-2026</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          appointment.services && appointment.services.length > 0 && (
            <div className="space-y-1">
              {appointment.services.map((serviceId, index) => (
                <div key={index} className={`${isCompact ? 'text-xs' : 'text-sm'} bg-primary/10 text-primary px-2 py-1 rounded inline-block mr-1`}>
                  {serviceLabels[serviceId] || serviceId}
                </div>
              ))}
            </div>
          )
        )}
      </TableCell>
      <TableCell>
        {editingId === appointment.id ? (
          <Textarea
            value={editedAppointment?.notes || ""}
            onChange={(e) => updateEditedField("notes", e.target.value)}
            placeholder="Notes..."
            className={`w-full ${isCompact ? 'text-xs min-h-[40px]' : 'text-sm min-h-[60px]'}`}
          />
        ) : (
          appointment.notes && (
            <div className="flex items-center space-x-1">
              <FileText className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-muted-foreground`} />
              <span className={`${isCompact ? 'text-xs' : 'text-sm'}`} title={appointment.notes}>
                {appointment.notes}
              </span>
            </div>
          )
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          {editingId === appointment.id ? (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={saveChanges}
                className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0`}
              >
                <Save className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEditing}
                className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0`}
              >
                <X className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEditing(appointment)}
                className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0`}
              >
                <Edit className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteAppointment(appointment.id)}
                className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0`}
              >
                <Trash2 className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Rendez-vous à venir */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Rendez-vous à venir</span>
          </CardTitle>
          <CardDescription>
            Rendez-vous planifiés triés par date et heure. Total : {upcomingAppointments.length} rendez-vous
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Chargement des rendez-vous...</p>
            </div>
          )}
          
          {!loading && upcomingAppointments.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rendez-vous à venir</h3>
              <p className="text-muted-foreground">
                Il n'y a actuellement aucun rendez-vous planifié.
              </p>
            </div>
          )}

          {!loading && upcomingAppointments.length > 0 && (
            <div className="space-y-4">
              {Object.entries(upcomingByDay).map(([date, dayAppointments]) => (
                <Card key={date} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>{format(parseISO(date), "EEEE d MMMM yyyy", { locale: fr })}</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        ({dayAppointments.length} rendez-vous)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Heure</TableHead>
                            <TableHead>Services</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayAppointments.map(appointment => (
                            <TableRow key={appointment.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div className="space-y-1">
                                    {editingId === appointment.id ? (
                                      <div className="space-y-1">
                                        <Input
                                          value={editedAppointment?.firstName || ""}
                                          onChange={(e) => updateEditedField("firstName", e.target.value)}
                                          placeholder="Prénom"
                                          className="w-full text-sm"
                                        />
                                        <Input
                                          value={editedAppointment?.lastName || ""}
                                          onChange={(e) => updateEditedField("lastName", e.target.value)}
                                          placeholder="Nom"
                                          className="w-full text-sm"
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-medium text-sm">
                                          {appointment.firstName} {appointment.lastName}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          ID: {appointment.id}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingId === appointment.id ? (
                                  <div className="space-y-1">
                                    <Input
                                      type="email"
                                      value={editedAppointment?.email || ""}
                                      onChange={(e) => updateEditedField("email", e.target.value)}
                                      placeholder="Email"
                                      className="w-full text-sm"
                                    />
                                    <Input
                                      value={editedAppointment?.phone || ""}
                                      onChange={(e) => updateEditedField("phone", e.target.value)}
                                      placeholder="Téléphone"
                                      className="w-full text-sm"
                                    />
                                  </div>
                                ) : (
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
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <div className="space-y-1">
                                    {editingId === appointment.id ? (
                                      <div className="space-y-1">
                                        <Input
                                          type="date"
                                          value={editedAppointment?.date || ""}
                                          onChange={(e) => updateEditedField("date", e.target.value)}
                                          className="w-full text-sm"
                                        />
                                        <Input
                                          type="time"
                                          value={editedAppointment?.time || ""}
                                          onChange={(e) => updateEditedField("time", e.target.value)}
                                          className="w-full text-sm"
                                        />
                                      </div>
                                    ) : (
                                      <div className="font-medium text-sm">
                                        {formatTimeForDisplay(appointment.time)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingId === appointment.id ? (
                                  <Select 
                                    value={editedAppointment?.services?.[0] || ""}
                                    onValueChange={(value) => updateEditedField("services", [value])}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Sélectionner un service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="covid">Vaccin 2025-2026 contre le COVID</SelectItem>
                                      <SelectItem value="grippe">Vaccin contre la grippe 2025-2026</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  appointment.services && appointment.services.length > 0 && (
                                    <div className="space-y-1">
                                      {appointment.services.map((serviceId, index) => (
                                        <div key={index} className="text-sm bg-primary/10 text-primary px-2 py-1 rounded inline-block mr-1">
                                          {serviceLabels[serviceId] || serviceId}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                )}
                              </TableCell>
                              <TableCell>
                                {editingId === appointment.id ? (
                                  <Textarea
                                    value={editedAppointment?.notes || ""}
                                    onChange={(e) => updateEditedField("notes", e.target.value)}
                                    placeholder="Notes..."
                                    className="w-full text-sm min-h-[60px]"
                                  />
                                ) : (
                                  appointment.notes && (
                                    <div className="flex items-center space-x-1">
                                      <FileText className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm" title={appointment.notes}>
                                        {appointment.notes}
                                      </span>
                                    </div>
                                  )
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {editingId === appointment.id ? (
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
                                        onClick={() => startEditing(appointment)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteAppointment(appointment.id)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rendez-vous passés */}
      {!loading && pastAppointments.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            >
              <div className="flex items-center space-x-2 text-lg">
                <History className="h-4 w-4" />
                <span>Historique des rendez-vous</span>
              </div>
              {isHistoryExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              Rendez-vous passés. Total : {pastAppointments.length} rendez-vous
            </CardDescription>
          </CardHeader>
          {isHistoryExpanded && (
            <CardContent>
              <div className="border rounded-lg bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-2">Patient</TableHead>
                      <TableHead className="py-2">Contact</TableHead>
                      <TableHead className="py-2">Date & Heure</TableHead>
                      <TableHead className="py-2">Services</TableHead>
                      <TableHead className="py-2">Notes</TableHead>
                      <TableHead className="py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAppointments.map((appointment) => renderAppointmentRow(appointment, true))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}