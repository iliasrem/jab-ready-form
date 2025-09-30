import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { capitalizeName } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

export function MakeupAppointmentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openNewPatient, setOpenNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: ""
  });
  const { toast } = useToast();

  // Charger la liste des patients
  useEffect(() => {
    loadPatients();
  }, []);

  // Charger les créneaux disponibles quand une date est sélectionnée
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, phone')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les patients"
      });
    }
  };

  // Filtrer les patients selon la recherche
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      patient.first_name.toLowerCase().includes(search) ||
      patient.last_name.toLowerCase().includes(search) ||
      patient.phone?.toLowerCase().includes(search) ||
      patient.email?.toLowerCase().includes(search)
    );
  });

  const loadAvailableSlots = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Récupérer les créneaux disponibles
      const { data: availability, error: availError } = await supabase
        .from('makeup_availability')
        .select('start_time, end_time')
        .eq('specific_date', dateStr)
        .eq('is_available', true);

      if (availError) throw availError;

      // Récupérer les créneaux déjà réservés
      const { data: booked, error: bookedError } = await supabase
        .from('makeup_appointments')
        .select('appointment_time')
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      if (bookedError) throw bookedError;

      const bookedTimes = new Set(booked?.map(b => b.appointment_time) || []);
      
      const available = (availability || [])
        .filter(slot => !bookedTimes.has(slot.start_time))
        .map(slot => ({
          start: slot.start_time.substring(0, 5),
          end: slot.end_time.substring(0, 5)
        }));

      setAvailableSlots(available);
      setSelectedSlot("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !selectedDate || !selectedSlot) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('makeup_appointments')
        .insert({
          patient_id: selectedPatient,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedSlot + ':00',
          notes: notes || null,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rendez-vous maquillage créé"
      });

      // Réinitialiser le formulaire
      setSelectedPatient("");
      setSelectedDate(undefined);
      setSelectedSlot("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.phone) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Nom, prénom et téléphone sont obligatoires"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          first_name: capitalizeName(newPatient.firstName),
          last_name: capitalizeName(newPatient.lastName),
          email: newPatient.email || null,
          phone: newPatient.phone,
          birth_date: newPatient.birthDate || null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Patient créé"
      });

      // Rafraîchir la liste et sélectionner le nouveau patient
      await loadPatients();
      setSelectedPatient(data.id);
      setOpenNewPatient(false);
      setNewPatient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        birthDate: ""
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau rendez-vous maquillage</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <div className="flex gap-2">
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5">
                    <Input
                      placeholder="Rechercher un patient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {filteredPatients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {capitalizeName(patient.first_name)} {capitalizeName(patient.last_name)}
                      {patient.phone && ` - ${patient.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={openNewPatient} onOpenChange={setOpenNewPatient}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau patient</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-firstName">Prénom *</Label>
                      <Input
                        id="new-firstName"
                        value={newPatient.firstName}
                        onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                        placeholder="Prénom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-lastName">Nom *</Label>
                      <Input
                        id="new-lastName"
                        value={newPatient.lastName}
                        onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                        placeholder="Nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-phone">Téléphone *</Label>
                      <Input
                        id="new-phone"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                        placeholder="Téléphone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                        placeholder="Email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-birthDate">Date de naissance</Label>
                      <Input
                        id="new-birthDate"
                        type="date"
                        value={newPatient.birthDate}
                        onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleCreatePatient} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Création..." : "Créer le patient"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  disabled={(date) => date < new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate && availableSlots.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="slot">Créneau *</Label>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un créneau" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot, index) => (
                    <SelectItem key={index} value={slot.start}>
                      {slot.start} - {slot.end}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedDate && availableSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun créneau disponible pour cette date
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || !selectedPatient || !selectedDate || !selectedSlot}
            className="w-full"
          >
            {loading ? "Création..." : "Créer le rendez-vous"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}