import { Link } from "react-router-dom";
import { AppointmentForm } from "@/components/AppointmentForm";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const PatientBooking = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="default" size="sm">
              Réservation
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">
                Administration
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Header */}
      <div className="bg-brand text-brand-foreground py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Pharmacie Remili-Bastin</h1>
            <p className="text-base sm:text-lg md:text-xl opacity-90">Réservez votre rendez-vous en ligne</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Instructions */}
          <div className="mb-8 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Réservation en ligne facile</h2>
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

          {/* Booking Form - Now handles its own data loading */}
          <AppointmentForm />

          {/* Additional Information */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Notre Service</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Vaccin :</strong> vaccin 2026-2027 contre le COVID</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Vaccin grippe :</strong> vaccin contre la grippe 2026-2027</span>
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
              href="https://api.whatsapp.com/send/?phone=32491559833&text=Bonjour%2C&type=phone_number&app_absent=0"
              className="inline-flex items-center gap-2 text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.521.074-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Contactez-nous sur WhatsApp
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
        </div>
      </div>
    </div>
  );
};

export default PatientBooking;