import { useEffect, useMemo, useState } from "react";
import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fr } from "date-fns/locale";

// créneaux par défaut (doit refléter le gestionnaire avancé)
const defaultTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"
];

// Page d'administration: vue Semaine / Mois / 3 mois des disponibilités avec édition
export default function AdminAvailabilityOverview() {
  type ViewMode = "day" | "week" | "month" | "quarter";

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<SpecificDateAvailability[]>([]);

  // SEO: titre + meta description + canonical
  useEffect(() => {
    document.title = "Admin | Disponibilités (semaine, mois, 3 mois)";

    const metaDescId = "meta-admin-availability-desc";
    let meta = document.querySelector(`meta[name='description']#${metaDescId}`) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      meta.id = metaDescId;
      document.head.appendChild(meta);
    }
    meta.content = "Aperçu et édition des disponibilités ouvertes par semaine, mois et 3 mois.";

    const linkId = "canonical-admin-availability";
    let link = document.querySelector(`link[rel='canonical']#${linkId}`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      link.id = linkId;
      document.head.appendChild(link);
    }
    link.href = window.location.href;
  }, []);

  // Index rapide par date (yyyy-MM-dd)
  const byDate = useMemo(() => {
    const map = new Map<string, SpecificDateAvailability>();
    availability.forEach((av) => {
      const key = format(av.date, "yyyy-MM-dd");
      map.set(key, av);
    });
    return map;
  }, [availability]);

  // Déterminer la période à afficher selon le mode
  const period = useMemo(() => {
    let start = new Date(periodStart);
    let end = new Date(periodStart);

    if (viewMode === "day") {
      end = start;
    } else if (viewMode === "week") {
      end = addDays(start, 6);
    } else if (viewMode === "month") {
      start = startOfMonth(start);
      end = endOfMonth(start);
    } else {
      // 3 mois: du début du mois courant jusqu'à la fin dans 2 mois
      start = startOfMonth(start);
      end = endOfMonth(addMonths(start, 2));
    }

    return eachDayOfInterval({ start, end });
  }, [viewMode, periodStart]);

  // Jours fériés belges et dimanches: calcul et aide
  const calculateEasterSunday = (year: number) => {
    // Algorithme grégorien anonyme
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0 = Janvier
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  };

  const belgianHolidayKeys = useMemo(() => {
    const years = new Set(period.map((d) => d.getFullYear()));
    const keys = new Set<string>();
    years.forEach((year) => {
      const easter = calculateEasterSunday(year);
      const push = (dt: Date) => keys.add(format(dt, "yyyy-MM-dd"));
      push(new Date(year, 0, 1)); // Jour de l'An
      push(addDays(easter, 1)); // Lundi de Pâques
      push(new Date(year, 4, 1)); // Fête du Travail
      push(addDays(easter, 39)); // Ascension
      push(addDays(easter, 50)); // Lundi de Pentecôte
      push(new Date(year, 6, 21)); // Fête nationale
      push(new Date(year, 7, 15)); // Assomption
      push(new Date(year, 10, 1)); // Toussaint
      push(new Date(year, 10, 11)); // Armistice
      push(new Date(year, 11, 25)); // Noël
    });
    return keys;
  }, [period]);

  const isBelgianHoliday = (date: Date) => {
    return belgianHolidayKeys.has(format(date, "yyyy-MM-dd"));
  };

  const countOpenSlots = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const av = byDate.get(key);
    if (!av || !av.enabled) return { label: "Fermé", tone: "secondary" as const };
    const open = av.timeSlots.filter((t) => t.available).length;
    return { label: `${open} créneau(x)`, tone: open === 0 ? ("destructive" as const) : ("default" as const) };
  };

  // helpers pour créer / mettre à jour
  const getDefaultDayAvailability = (date: Date): SpecificDateAvailability => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return {
      date,
      enabled: !isWeekend,
      timeSlots: defaultTimeSlots.map((time) => ({
        time,
        available: !isWeekend && !["12:00","12:15","12:30","12:45","13:00","13:15","13:30","13:45"].includes(time)
      }))
    };
  };

  const getAvailabilityForDate = (date: Date): SpecificDateAvailability => {
    const key = format(date, "yyyy-MM-dd");
    const existing = byDate.get(key);
    return existing ?? getDefaultDayAvailability(date);
  };

  const updateDateAvailability = (updated: SpecificDateAvailability) => {
    setAvailability((prev) => {
      const next = prev.filter((av) => format(av.date, "yyyy-MM-dd") !== format(updated.date, "yyyy-MM-dd"));
      next.push(updated);
      return next;
    });
  };

  const openAll = (date: Date) => {
    const current = getAvailabilityForDate(date);
    const updated: SpecificDateAvailability = {
      ...current,
      enabled: true,
      timeSlots: current.timeSlots.map((s) => ({ ...s, available: true }))
    };
    updateDateAvailability(updated);
  };

  const closeAll = (date: Date) => {
    const current = getAvailabilityForDate(date);
    const updated: SpecificDateAvailability = {
      ...current,
      enabled: false,
      timeSlots: current.timeSlots.map((s) => ({ ...s, available: false }))
    };
    updateDateAvailability(updated);
  };

  const closeAllInPeriod = () => {
    setAvailability((prev) => {
      const dates = period;
      const updates = dates.map((d) => {
        const current = getAvailabilityForDate(d);
        return {
          ...current,
          enabled: false,
          timeSlots: current.timeSlots.map((s) => ({ ...s, available: false })),
        };
      });
      const other = prev.filter(
        (av) => !dates.some((d) => format(av.date, "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
      );
      return [...other, ...updates];
    });
  };

  const goPrev = () => {
    if (viewMode === "day") setPeriodStart(addDays(periodStart, -1));
    else if (viewMode === "week") setPeriodStart(addDays(periodStart, -7));
    else if (viewMode === "month") setPeriodStart(addMonths(periodStart, -1));
    else setPeriodStart(addMonths(periodStart, -3));
  };
  const goNext = () => {
    if (viewMode === "day") setPeriodStart(addDays(periodStart, 1));
    else if (viewMode === "week") setPeriodStart(addDays(periodStart, 7));
    else if (viewMode === "month") setPeriodStart(addMonths(periodStart, 1));
    else setPeriodStart(addMonths(periodStart, 3));
  };
  const goToday = () => setPeriodStart(new Date());

  return (
    <div>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Disponibilités — Vue administrateur</h1>
          <p className="text-sm text-muted-foreground">Semaine, mois et 3 mois — consulter et modifier</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section aria-label="Contrôles de période" className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex gap-2">
            <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>Jour</Button>
            <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>Semaine</Button>
            <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>Mois</Button>
            <Button variant={viewMode === "quarter" ? "default" : "outline"} size="sm" onClick={() => setViewMode("quarter")}>3 mois</Button>
          </div>
          <div className="inline-flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>Précédent</Button>
            <Button variant="outline" size="sm" onClick={goToday}>Aujourd'hui</Button>
            <Button variant="outline" size="sm" onClick={goNext}>Suivant</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Tout fermer</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tout fermer dans la période visible</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va fermer tous les créneaux pour chaque jour actuellement affiché. Vous pourrez ré-ouvrir ensuite des jours ou des créneaux spécifiques.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={closeAllInPeriod}>Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <section aria-label="Aperçu des disponibilités">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu des disponibilités ouvertes</CardTitle>
              <CardDescription>
                Survolez ou cliquez sur un jour pour voir le nombre de créneaux ouverts. Modifiez les horaires via le panneau d'édition ci-dessous.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {period.map((d) => {
                  const info = countOpenSlots(d);
                  const isSunday = d.getDay() === 0;
                  const isHoliday = isBelgianHoliday(d);
                  const isOffDay = isSunday || isHoliday;
                  return (
                    <div key={format(d, "yyyy-MM-dd")} className={`p-3 rounded-lg border ${isOffDay ? "bg-muted" : "bg-card"}`} aria-label={`${format(d, "P", { locale: fr })}${isHoliday ? " — Jour férié (BE)" : isSunday ? " — Dimanche" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{format(d, "EEE d MMM", { locale: fr })}</span>
                        <Badge variant={info.tone}>{info.label}</Badge>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openAll(d)} aria-label={`Ouvrir tous les créneaux du ${format(d, "P", { locale: fr })}`}>Ouvrir</Button>
                        <Button size="sm" variant="outline" onClick={() => closeAll(d)} aria-label={`Fermer tous les créneaux du ${format(d, "P", { locale: fr })}`}>Fermer</Button>
                      </div>
                      {(viewMode === "day" || viewMode === "week") && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2" aria-label={`Créneaux du ${format(d, "P", { locale: fr })}`}>
                            {getAvailabilityForDate(d).timeSlots.map((slot) => (
                              <Badge
                                key={slot.time}
                                variant={slot.available ? "default" : "secondary"}
                                aria-label={`${slot.time} ${slot.available ? "ouvert" : "fermé"}`}
                              >
                                {slot.time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <aside aria-label="Édition des disponibilités">
          <AdvancedAvailabilityManager initialAvailability={availability} onAvailabilityChange={setAvailability} />
        </aside>
      </main>
    </div>
  );
}
