import { useEffect, useMemo, useState } from "react";
import type { SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fr } from "date-fns/locale";
import { Star, UploadCloud, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

// créneaux par défaut (doit refléter le gestionnaire avancé)
const defaultTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"
];

const saturdayTimeSlots = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", 
  "11:00", "11:15", "11:30", "11:45"
];

// Page d'administration: vue Semaine / Mois / 3 mois des disponibilités avec édition
export default function AdminAvailabilityOverview() {
  type ViewMode = "day" | "week" | "month" | "quarter";

  const [viewMode, setViewMode] = useState<ViewMode>("quarter");
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<SpecificDateAvailability[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

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
      // 2 mois: du début du mois courant jusqu'à la fin dans 1 mois
      start = startOfMonth(start);
      end = endOfMonth(addMonths(start, 1));
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
    if (!av) return { label: "Fermé", tone: "secondary" as const };
    const open = av.timeSlots.filter((t) => t.available).length;
    if (open === 0) return { label: "Fermé", tone: "secondary" as const };
    return { label: `${open} créneau(x)`, tone: "default" as const };
  };

  // helpers pour créer / mettre à jour
  const getDefaultDayAvailability = (date: Date): SpecificDateAvailability => {
    const isSaturday = date.getDay() === 6;
    const slots = isSaturday ? saturdayTimeSlots : defaultTimeSlots;
    
    return {
      date,
      timeSlots: slots.map((time) => ({
        time,
        available: false // Tous les créneaux fermés par défaut
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
      timeSlots: current.timeSlots.map((s) => ({ ...s, available: true }))
    };
    updateDateAvailability(updated);
  };

  const closeAll = (date: Date) => {
    const current = getAvailabilityForDate(date);
    const updated: SpecificDateAvailability = {
      ...current,
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

  // Helpers to work with time strings like "HH:mm"
  const timeStrToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const minutesToTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:00`;
  };
  const addMinutesStr = (t: string, delta: number) => minutesToTimeStr(timeStrToMinutes(t) + delta);

  // Charger les disponibilités depuis Supabase pour la période visible avec mise à jour en temps réel
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) return;

        // Calculer les dates min et max de la période
        const dates = period;
        if (dates.length === 0) return;

        const minDate = format(dates[0], "yyyy-MM-dd");
        const maxDate = format(dates[dates.length - 1], "yyyy-MM-dd");
        
        console.log("📅 Chargement des disponibilités:", { minDate, maxDate, userId: user.id, totalDays: dates.length });

        // Charger TOUTES les disponibilités (is_available true ET false) pour afficher l'état actuel
        const { data, error } = await supabase
          .from("specific_date_availability")
          .select("*")
          .eq("user_id", user.id)
          .gte("specific_date", minDate)
          .lte("specific_date", maxDate);

        if (error) throw error;
        
        console.log("✅ Données récupérées:", data?.length || 0, "entrées");

        if (data && data.length > 0) {
          // Regrouper par date et créer les objets SpecificDateAvailability
          const byDateMap = new Map<string, SpecificDateAvailability>();

          data.forEach((row) => {
            const dateKey = row.specific_date;
            if (!byDateMap.has(dateKey)) {
              const date = new Date(dateKey + "T00:00:00");
              byDateMap.set(dateKey, {
                date,
                timeSlots: defaultTimeSlots.map((time) => ({
                  time,
                  available: false
                }))
              });
            }

            const dayAvailability = byDateMap.get(dateKey)!;
            const startMinutes = timeStrToMinutes(row.start_time.substring(0, 5));
            const endMinutes = timeStrToMinutes(row.end_time.substring(0, 5));

            // Gérer le cas où start_time = end_time (créneau ponctuel de 15 minutes)
            const isSingleSlot = startMinutes === endMinutes;

            // Marquer les créneaux selon is_available
            dayAvailability.timeSlots.forEach((slot) => {
              const slotMinutes = timeStrToMinutes(slot.time);
              
              if (isSingleSlot) {
                // Créneau ponctuel: correspondance exacte
                if (slotMinutes === startMinutes) {
                  slot.available = row.is_available;
                }
              } else {
                // Plage de créneaux: inclure tous les créneaux dans l'intervalle
                if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
                  slot.available = row.is_available;
                }
              }
            });

            // Les créneaux disponibles sont maintenant marqués
          });
          
          console.log("📊 Disponibilités créées:", {
            totalDates: byDateMap.size,
            dates: Array.from(byDateMap.keys()),
            sampleData: Array.from(byDateMap.values()).slice(0, 2)
          });

          setAvailability(Array.from(byDateMap.values()));
        } else {
          // Aucune donnée en base pour cette période
          setAvailability([]);
        }
      } catch (e: any) {
        console.error("Erreur lors du chargement des disponibilités:", e);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: e?.message ?? "Impossible de charger les disponibilités."
        });
      }
    };

    loadAvailability();

    // Abonnement en temps réel pour les mises à jour
    const channel = supabase
      .channel('admin-availability-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'specific_date_availability'
        },
        () => {
          console.log("🔄 Changement détecté dans specific_date_availability, rechargement...");
          loadAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          console.log("🔄 Changement détecté dans appointments, rechargement...");
          loadAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_dates'
        },
        () => {
          console.log("🔄 Changement détecté dans blocked_dates, rechargement...");
          loadAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period, toast]);

  const groupContiguous = (times: string[]) => {
    if (times.length === 0) return [] as Array<{ start: string; end: string }>;
    const sorted = [...times].sort((a, b) => timeStrToMinutes(a) - timeStrToMinutes(b));
    const ranges: Array<{ start: string; end: string }> = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (timeStrToMinutes(cur) !== timeStrToMinutes(prev) + 15) {
        // close current range -> end is prev + 15 minutes to cover the last slot
        ranges.push({ start: `${start}:00`, end: addMinutesStr(prev, 15) });
        start = cur;
      }
      prev = cur;
    }
    ranges.push({ start: `${start}:00`, end: addMinutesStr(prev, 15) });
    return ranges;
  };

  const publishVisiblePeriod = async () => {
    setIsPublishing(true);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Veuillez vous connecter pour publier." });
        return;
      }
      const userId = user.id;

      // Dates de la période visible
      const dates = period.map((d) => format(d, "yyyy-MM-dd"));

      // Nettoyer toutes les dispos existantes sur la période
      const { error: delErr } = await supabase
        .from("specific_date_availability")
        .delete()
        .eq("user_id", userId)
        .in("specific_date", dates);
      if (delErr) throw delErr;

      // Construire les nouveaux créneaux (regroupés par plages contiguës)
      type Row = { user_id: string; specific_date: string; start_time: string; end_time: string; is_available: boolean };
      const rows: Row[] = [];

      period.forEach((d) => {
        const av = getAvailabilityForDate(d);
        const openTimes = av.timeSlots.filter((t) => t.available).map((t) => t.time);
        if (openTimes.length > 0) {
          const ranges = groupContiguous(openTimes);
          ranges.forEach((r) => {
            rows.push({
              user_id: userId,
              specific_date: format(d, "yyyy-MM-dd"),
              start_time: r.start,
              end_time: r.end,
              is_available: true,
            });
          });
        }
        // Si fermé: aucune ligne insérée => jour fermé
      });

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("specific_date_availability").insert(rows);
        if (insErr) throw insErr;
      }

      toast({ title: "Disponibilités publiées", description: "La période visible a été enregistrée." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur de publication", description: e?.message ?? "Veuillez réessayer." });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Disponibilités — Vue administrateur</h1>
              <p className="text-sm text-muted-foreground">Semaine, mois et 3 mois — consulter et modifier</p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" />
                Retour Admin
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section aria-label="Contrôles de période" className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex gap-2">
            <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>Jour</Button>
            <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>Semaine</Button>
            <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>Mois</Button>
            <Button variant={viewMode === "quarter" ? "default" : "outline"} size="sm" onClick={() => setViewMode("quarter")}>2 mois</Button>
          </div>
          <div className="inline-flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>Précédent</Button>
            <Button variant="outline" size="sm" onClick={goToday}>Aujourd'hui</Button>
            <Button variant="outline" size="sm" onClick={goNext}>Suivant</Button>
            <Button size="sm" onClick={publishVisiblePeriod} disabled={isPublishing} aria-label="Publier les disponibilités de la période visible">
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Publication...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
                  Publier
                </>
              )}
            </Button>
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{format(d, "EEE d MMM", { locale: fr })}</span>
                          {isHoliday && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 hover-scale animate-fade-in"
                              aria-label="Jour férié en Belgique"
                            >
                              <Star className="h-3 w-3" aria-hidden="true" />
                              Férié
                            </Badge>
                          )}
                        </div>
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

        

      </main>
    </div>
  );
}
