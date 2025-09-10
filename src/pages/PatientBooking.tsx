import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { DayAvailability } from "@/components/AvailabilityManager";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

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

  useEffect(() => {
    // In a real app, you would fetch this from your backend
    setAvailability(defaultAvailability);
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
          <AppointmentForm availability={availability} />

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