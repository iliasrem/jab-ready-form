import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { DayAvailability } from "@/components/AvailabilityManager";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

// Mock availability data - in a real app this would come from your backend
const defaultAvailability: DayAvailability[] = [
  {
    day: "Monday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:15", available: true },
      { time: "09:30", available: true },
      { time: "09:45", available: true },
      { time: "10:00", available: true },
      { time: "10:15", available: true },
      { time: "10:30", available: true },
      { time: "10:45", available: true },
      { time: "11:00", available: true },
      { time: "11:15", available: true },
      { time: "11:30", available: true },
      { time: "11:45", available: true },
      { time: "12:00", available: false }, // Pause déjeuner
      { time: "12:15", available: false }, // Pause déjeuner
      { time: "12:30", available: false }, // Pause déjeuner
      { time: "12:45", available: false }, // Pause déjeuner
      { time: "13:00", available: false }, // Pause déjeuner
      { time: "13:15", available: false }, // Pause déjeuner
      { time: "13:30", available: false }, // Pause déjeuner
      { time: "13:45", available: false }, // Pause déjeuner
      { time: "14:00", available: true },
      { time: "14:15", available: true },
      { time: "14:30", available: true },
      { time: "14:45", available: true },
      { time: "15:00", available: true },
      { time: "15:15", available: true },
      { time: "15:30", available: true },
      { time: "15:45", available: true },
      { time: "16:00", available: true },
      { time: "16:15", available: true },
      { time: "16:30", available: true },
      { time: "16:45", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Tuesday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:15", available: true },
      { time: "09:30", available: true },
      { time: "09:45", available: true },
      { time: "10:00", available: true },
      { time: "10:15", available: true },
      { time: "10:30", available: true },
      { time: "10:45", available: true },
      { time: "11:00", available: true },
      { time: "11:15", available: true },
      { time: "11:30", available: true },
      { time: "11:45", available: true },
      { time: "12:00", available: false },
      { time: "12:15", available: false },
      { time: "12:30", available: false },
      { time: "12:45", available: false },
      { time: "13:00", available: false },
      { time: "13:15", available: false },
      { time: "13:30", available: false },
      { time: "13:45", available: false },
      { time: "14:00", available: true },
      { time: "14:15", available: true },
      { time: "14:30", available: true },
      { time: "14:45", available: true },
      { time: "15:00", available: true },
      { time: "15:15", available: true },
      { time: "15:30", available: true },
      { time: "15:45", available: true },
      { time: "16:00", available: true },
      { time: "16:15", available: true },
      { time: "16:30", available: true },
      { time: "16:45", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Wednesday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:15", available: true },
      { time: "09:30", available: true },
      { time: "09:45", available: true },
      { time: "10:00", available: true },
      { time: "10:15", available: true },
      { time: "10:30", available: true },
      { time: "10:45", available: true },
      { time: "11:00", available: true },
      { time: "11:15", available: true },
      { time: "11:30", available: true },
      { time: "11:45", available: true },
      { time: "12:00", available: false },
      { time: "12:15", available: false },
      { time: "12:30", available: false },
      { time: "12:45", available: false },
      { time: "13:00", available: false },
      { time: "13:15", available: false },
      { time: "13:30", available: false },
      { time: "13:45", available: false },
      { time: "14:00", available: true },
      { time: "14:15", available: true },
      { time: "14:30", available: true },
      { time: "14:45", available: true },
      { time: "15:00", available: true },
      { time: "15:15", available: true },
      { time: "15:30", available: true },
      { time: "15:45", available: true },
      { time: "16:00", available: true },
      { time: "16:15", available: true },
      { time: "16:30", available: true },
      { time: "16:45", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Thursday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:15", available: true },
      { time: "09:30", available: true },
      { time: "09:45", available: true },
      { time: "10:00", available: true },
      { time: "10:15", available: true },
      { time: "10:30", available: true },
      { time: "10:45", available: true },
      { time: "11:00", available: true },
      { time: "11:15", available: true },
      { time: "11:30", available: true },
      { time: "11:45", available: true },
      { time: "12:00", available: false },
      { time: "12:15", available: false },
      { time: "12:30", available: false },
      { time: "12:45", available: false },
      { time: "13:00", available: false },
      { time: "13:15", available: false },
      { time: "13:30", available: false },
      { time: "13:45", available: false },
      { time: "14:00", available: true },
      { time: "14:15", available: true },
      { time: "14:30", available: true },
      { time: "14:45", available: true },
      { time: "15:00", available: true },
      { time: "15:15", available: true },
      { time: "15:30", available: true },
      { time: "15:45", available: true },
      { time: "16:00", available: true },
      { time: "16:15", available: true },
      { time: "16:30", available: true },
      { time: "16:45", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Friday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:15", available: true },
      { time: "09:30", available: true },
      { time: "09:45", available: true },
      { time: "10:00", available: true },
      { time: "10:15", available: true },
      { time: "10:30", available: true },
      { time: "10:45", available: true },
      { time: "11:00", available: true },
      { time: "11:15", available: true },
      { time: "11:30", available: true },
      { time: "11:45", available: true },
      { time: "12:00", available: false },
      { time: "12:15", available: false },
      { time: "12:30", available: false },
      { time: "12:45", available: false },
      { time: "13:00", available: false },
      { time: "13:15", available: false },
      { time: "13:30", available: false },
      { time: "13:45", available: false },
      { time: "14:00", available: true },
      { time: "14:15", available: true },
      { time: "14:30", available: true },
      { time: "14:45", available: true },
      { time: "15:00", available: true },
      { time: "15:15", available: true },
      { time: "15:30", available: true },
      { time: "15:45", available: true },
      { time: "16:00", available: true },
      { time: "16:15", available: true },
      { time: "16:30", available: true },
      { time: "16:45", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Saturday",
    enabled: false,
    timeSlots: []
  },
  {
    day: "Sunday",
    enabled: false,
    timeSlots: []
  }
];

const PatientBooking = () => {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  // Créneaux par défaut (15 minutes)
  const defaultTimeSlots = [
    "09:00", "09:15", "09:30", "09:45",
    "10:00", "10:15", "10:30", "10:45",
    "11:00", "11:15", "11:30", "11:45",
    "14:00", "14:15", "14:30", "14:45",
    "15:00", "15:15", "15:30", "15:45",
    "16:00", "16:15", "16:30", "16:45",
    "17:00"
  ];

  // Charger les disponibilités depuis Supabase
  const loadAvailabilityFromSupabase = async () => {
    try {
      setLoading(true);
      console.log('=== CHARGEMENT PATIENT BOOKING ===');
      
      // Charger les prochains 3 mois de disponibilités
      const currentDate = new Date();
      const startDate = format(currentDate, 'yyyy-MM-dd');
      const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0), 'yyyy-MM-dd');
      
      console.log('Période de chargement patient:', startDate, 'à', endDate);

      // Charger TOUTES les disponibilités futures (sans filtrer par user_id car les patients voient tout)
      const { data, error } = await supabase
        .from('specific_date_availability')
        .select('*')
        .eq('is_available', true)
        .gte('specific_date', startDate)
        .lte('specific_date', endDate)
        .order('specific_date', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement patient:', error);
        setAvailability(defaultAvailability);
        return;
      }

      console.log('Créneaux disponibles pour patients:', data?.length || 0);
      console.log('Données patient:', data);

      if (!data || data.length === 0) {
        console.log('Aucune disponibilité trouvée dans Supabase, utilisation des données par défaut');
        setAvailability(defaultAvailability);
        return;
      }

      // Grouper par date spécifique pour créer une structure de jours
      const dateGroupedAvailability: { [key: string]: { date: string; timeSlots: string[] } } = {};
      
      data.forEach(item => {
        const dateKey = item.specific_date;
        if (!dateGroupedAvailability[dateKey]) {
          dateGroupedAvailability[dateKey] = {
            date: dateKey,
            timeSlots: []
          };
        }
        dateGroupedAvailability[dateKey].timeSlots.push(item.start_time);
      });

      // Convertir en format DayAvailability en prenant la première date disponible de chaque jour de la semaine
      const dayAvailabilityMap: { [key: string]: DayAvailability } = {
        'Monday': { day: 'Monday', enabled: false, timeSlots: [] },
        'Tuesday': { day: 'Tuesday', enabled: false, timeSlots: [] },
        'Wednesday': { day: 'Wednesday', enabled: false, timeSlots: [] },
        'Thursday': { day: 'Thursday', enabled: false, timeSlots: [] },
        'Friday': { day: 'Friday', enabled: false, timeSlots: [] },
        'Saturday': { day: 'Saturday', enabled: false, timeSlots: [] },
        'Sunday': { day: 'Sunday', enabled: false, timeSlots: [] }
      };

      // Analyser les dates disponibles
      Object.values(dateGroupedAvailability).forEach(({ date, timeSlots }) => {
        const dateObj = new Date(date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dateObj.getDay()];
        
        // Si ce jour de la semaine n'est pas encore configuré, l'activer
        if (!dayAvailabilityMap[dayName].enabled) {
          dayAvailabilityMap[dayName].enabled = true;
          // Initialiser tous les créneaux par défaut comme non disponibles
          dayAvailabilityMap[dayName].timeSlots = defaultTimeSlots.map(time => ({
            time,
            available: false
          }));
        }
        
        // Marquer les créneaux disponibles pour ce jour de la semaine
        timeSlots.forEach(timeSlot => {
          const slot = dayAvailabilityMap[dayName].timeSlots.find(s => s.time === timeSlot);
          if (slot) {
            slot.available = true;
          }
        });
      });

      // Convertir en tableau
      const availabilityArray = Object.values(dayAvailabilityMap);

      console.log('Disponibilités finales patient:', availabilityArray);
      setAvailability(availabilityArray);
      
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités patient:', error);
      setAvailability(defaultAvailability);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailabilityFromSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-brand text-brand-foreground py-8">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-2">Pharmacie Remili-Bastin</h1>
            <p className="text-xl opacity-90">Réservez votre rendez-vous en ligne</p>
          </div>
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link to="/admin">
              <Settings className="h-4 w-4" />
              Administration
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Instructions */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Réservation en ligne facile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Remplir les informations</h3>
                <p className="text-sm text-muted-foreground">Entrez vos coordonnées et informations de contact</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">Choisir Date et Heure</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez votre date et créneau horaire préférés</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Confirmer la Réservation</h3>
                <p className="text-sm text-muted-foreground">Vérifiez et soumettez votre demande de rendez-vous</p>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          {loading ? (
            <div className="bg-card p-8 rounded-lg border text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des disponibilités...</p>
            </div>
          ) : (
            <AppointmentForm availability={availability} />
          )}

          {/* Additional Information */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Notre Service</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Vaccin :</strong> vaccin 2025-2026 contre le COVID</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Vaccin grippe :</strong> vaccin contre la grippe 2025-2026</span>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Notes importantes</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Veuillez arriver 15 minutes avant votre rendez-vous</li>
                <li>• Apportez une pièce d&apos;identité valide</li>
                <li>• Les annulations doivent être faites 24 heures à l&apos;avance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted/30 py-8 mt-12">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-muted-foreground">
            Besoin d&apos;aide ? Contactez-nous au{" "}
            <a href="tel:+32064442253" className="text-primary hover:underline">
              064 44 22 53
            </a>{" "}
            ou{" "}
            <a href="mailto:info@remili.be" className="text-primary hover:underline">
              info@remili.be
            </a>
          </p>
          <p>
            <a
              href="https://www.remili.be/privacy"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Politique de confidentialité
            </a>
          </p>
          <p className="text-xs text-muted-foreground">Copyright : Pharmacie Remili Bastin - Remili I. - APB 521005</p>
        </div>
      </div>
    </div>
  );
};

export default PatientBooking;