import { useEffect, useMemo, useState } from "react";
import { AdvancedAvailabilityManager, SpecificDateAvailability } from "@/components/AdvancedAvailabilityManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

// Page d'administration: vue Semaine / Mois / 3 mois des disponibilités avec édition
export default function AdminAvailabilityOverview() {
  type ViewMode = "week" | "month" | "quarter";

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

    if (viewMode === "week") {
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

  const countOpenSlots = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const av = byDate.get(key);
    if (!av || !av.enabled) return { label: "Fermé", tone: "secondary" as const };
    const open = av.timeSlots.filter((t) => t.available).length;
    return { label: `${open} créneau(x)`, tone: open === 0 ? ("destructive" as const) : ("default" as const) };
  };

  const goPrev = () => {
    if (viewMode === "week") setPeriodStart(addDays(periodStart, -7));
    else if (viewMode === "month") setPeriodStart(addMonths(periodStart, -1));
    else setPeriodStart(addMonths(periodStart, -3));
  };
  const goNext = () => {
    if (viewMode === "week") setPeriodStart(addDays(periodStart, 7));
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
            <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>Semaine</Button>
            <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>Mois</Button>
            <Button variant={viewMode === "quarter" ? "default" : "outline"} size="sm" onClick={() => setViewMode("quarter")}>3 mois</Button>
          </div>
          <div className="inline-flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>Précédent</Button>
            <Button variant="outline" size="sm" onClick={goToday}>Aujourd'hui</Button>
            <Button variant="outline" size="sm" onClick={goNext}>Suivant</Button>
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
                  return (
                    <div key={format(d, "yyyy-MM-dd")} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{format(d, "EEE d MMM", { locale: fr })}</span>
                        <Badge variant={info.tone}>{info.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <aside aria-label="Édition des disponibilités">
          <AdvancedAvailabilityManager onAvailabilityChange={setAvailability} />
        </aside>
      </main>
    </div>
  );
}
