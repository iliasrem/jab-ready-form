import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarCheck,
  CalendarDays,
  CalendarX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Loader2,
  Repeat,
  Save,
  Undo2,
} from "lucide-react";
import {
  format,
  parseISO,
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getSeasonRange, getStableWindow, seasonLabel } from "@/lib/season";

export interface SpecificDateAvailability {
  date: Date;
  blocked?: boolean;
  blockActivity?: string;
  timeSlots: { time: string; available: boolean; reserved?: boolean }[];
}

const WEEKDAY_SLOTS = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00",
];

const SATURDAY_SLOTS = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
];

/** Grille horaire réelle du jour (12 créneaux le samedi, aucun le dimanche). */
const gridForDate = (date: Date): string[] => {
  const dow = date.getDay();
  if (dow === 0) return [];
  if (dow === 6) return SATURDAY_SLOTS;
  return WEEKDAY_SLOTS;
};

const toKey = (date: Date) => format(date, "yyyy-MM-dd");
const hhmm = (t: string) => t.slice(0, 5);

interface ServerDay {
  open: string[];
  reserved: string[];
  blocked: boolean;
  blockActivity?: string;
}

interface AdvancedAvailabilityManagerProps {
  onAvailabilityChange: (availability: SpecificDateAvailability[]) => void;
  initialAvailability?: SpecificDateAvailability[];
  onDirtyChange?: (dirty: boolean) => void;
  registerSaveHandler?: (handler: (() => Promise<boolean>) | null) => void;
}

export function AdvancedAvailabilityManager({
  onAvailabilityChange,
  onDirtyChange,
  registerSaveHandler,
}: AdvancedAvailabilityManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Modifications locales non sauvegardées : date -> créneaux ouverts
  const [localDays, setLocalDays] = useState<Record<string, string[]>>({});
  const dirtyKeys = useMemo(() => Object.keys(localDays), [localDays]);
  const hasUnsavedChanges = dirtyKeys.length > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ===== Chargement : toute la saison (1er oct -> 31 jan) en une seule requête =====
  // La saison est ancrée sur aujourd'hui, jamais sur le mois visualisé.
  const today = useMemo(() => new Date(), []);
  const season = useMemo(() => getSeasonRange(today), [today]);

  const windowRange = useMemo(() => getStableWindow(today, selectedWeek), [today, selectedWeek]);

  const startKey = format(windowRange.start, "yyyy-MM-dd");
  const endKey = format(windowRange.end, "yyyy-MM-dd");

  const fetchRange = useCallback(
    async (start: string, end: string): Promise<Record<string, ServerDay>> => {
      const { data, error } = await supabase.rpc("get_availability_range", {
        p_start: start,
        p_end: end,
      });
      if (error) throw error;

      const map: Record<string, ServerDay> = {};
      (data ?? []).forEach((row) => {
        map[row.specific_date] = {
          open: (row.open_times ?? []).map(hhmm),
          reserved: (row.reserved_times ?? []).map(hhmm),
          blocked: !!row.is_blocked,
          blockActivity: row.block_activity ?? undefined,
        };
      });
      return map;
    },
    []
  );

  const { data: serverDays, isFetching } = useQuery({
    queryKey: ["availability", startKey, endKey],
    queryFn: () => fetchRange(startKey, endKey),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  // Temps réel : une seule souscription, invalidations débouncées et ignorées pendant la sauvegarde
  const isSavingRef = useRef(false);
  isSavingRef.current = isSaving;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (isSavingRef.current) return;
        queryClient.invalidateQueries({ queryKey: ["availability"] });
      }, 500);
    };

    const channel = supabase
      .channel("availability-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_dates" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specific_date_availability" },
        invalidate
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ===== Fusion serveur + modifications locales =====
  const getDay = useCallback(
    (date: Date): SpecificDateAvailability => {
      const key = toKey(date);
      const server = serverDays?.[key];
      const open = new Set(localDays[key] ?? server?.open ?? []);
      const reserved = new Set(server?.reserved ?? []);

      return {
        date,
        blocked: server?.blocked,
        blockActivity: server?.blockActivity,
        timeSlots: gridForDate(date).map((time) => ({
          time,
          available: open.has(time) && !server?.blocked,
          reserved: reserved.has(time),
        })),
      };
    },
    [serverDays, localDays]
  );

  /** Un jour bloqué ne peut jamais être modifié. */
  const isBlockedDay = useCallback(
    (date: Date) => !!serverDays?.[toKey(date)]?.blocked,
    [serverDays]
  );

  const openTimesOf = useCallback(
    (date: Date): string[] => {
      const key = toKey(date);
      const grid = gridForDate(date);
      const source = localDays[key] ?? serverDays?.[key]?.open ?? [];
      return grid.filter((t) => source.includes(t));
    },
    [serverDays, localDays]
  );

  /** Applique des modifications locales (dates -> créneaux ouverts). Ignore les jours inchangés. */
  const patchDays = useCallback(
    (patch: Record<string, string[]>) => {
      setLocalDays((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(patch).forEach(([key, times]) => {
          const current = next[key] ?? serverDays?.[key]?.open ?? [];
          const same = current.length === times.length && times.every((t) => current.includes(t));
          if (same && !(key in prev)) return; // pas de vrai changement
          if (same && key in prev) {
            // Revenu à l'état serveur : retirer la modification locale
            delete next[key];
            changed = true;
            return;
          }
          next[key] = times;
          changed = true;
        });
        return changed ? next : prev;
      });
    },
    [serverDays]
  );

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(selectedWeek, { weekStartsOn: 1 }),
        end: endOfWeek(selectedWeek, { weekStartsOn: 1 }),
      }).filter((d) => d.getDay() !== 0),
    [selectedWeek]
  );

  // Informer le parent des données visibles
  useEffect(() => {
    onAvailabilityChange(weekDays.map(getDay));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, getDay]);

  // ===== Actions =====
  const toggleTimeSlot = (date: Date, time: string) => {
    if (isBlockedDay(date)) return;
    const open = openTimesOf(date);
    const next = open.includes(time) ? open.filter((t) => t !== time) : [...open, time];
    patchDays({ [toKey(date)]: gridForDate(date).filter((t) => next.includes(t)) });
  };

  const applyDefaultToWeek = () => {
    const patch: Record<string, string[]> = {};
    weekDays.forEach((d) => {
      if (isBlockedDay(d)) return;
      patch[toKey(d)] = gridForDate(d);
    });
    patchDays(patch);
    toast({ title: "Semaine ouverte", description: "Tous les créneaux de la semaine sont ouverts." });
  };

  const closeWeek = () => {
    const patch: Record<string, string[]> = {};
    weekDays.forEach((d) => {
      if (isBlockedDay(d)) return;
      patch[toKey(d)] = [];
    });
    patchDays(patch);
    toast({ title: "Semaine fermée", description: "Tous les créneaux de la semaine sont fermés." });
  };

  /** Copie un modèle jour de semaine -> même jour de semaine, en restant dans la grille du jour cible. */
  const copyWeekPattern = (targetDays: Date[], sourceWeek: Date[]) => {
    const byDow = new Map<number, string[]>();
    sourceWeek.forEach((d) => byDow.set(d.getDay(), openTimesOf(d)));

    const patch: Record<string, string[]> = {};
    targetDays.forEach((d) => {
      if (isBlockedDay(d)) return;
      const template = byDow.get(d.getDay());
      if (!template) return;
      patch[toKey(d)] = gridForDate(d).filter((t) => template.includes(t));
    });
    patchDays(patch);
  };

  const copyPreviousWeek = () => {
    const previous = weekDays.map((d) => addDays(d, -7));
    copyWeekPattern(weekDays, previous);
    toast({
      title: "Semaine précédente copiée",
      description: "Les horaires de la semaine précédente ont été repris.",
    });
  };

  // ===== Propagation (avec confirmation) =====
  const [pendingApply, setPendingApply] = useState<{ days: Date[]; description: string } | null>(
    null
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState<string>(() =>
    format(getSeasonRange(new Date()).end, "yyyy-MM-dd")
  );

  const requestApply = (days: Date[], description: string) => {
    const target = days.filter((d) => d.getDay() !== 0 && !isBlockedDay(d));
    if (target.length === 0) {
      toast({
        title: "Aucun jour concerné",
        description: "La plage sélectionnée ne contient aucun jour modifiable.",
      });
      return;
    }
    setPendingApply({ days: target, description });
  };

  const confirmApply = () => {
    if (!pendingApply) return;
    copyWeekPattern(pendingApply.days, weekDays);
    toast({ title: "Modèle appliqué", description: pendingApply.description });
    setPendingApply(null);
  };

  const applyToMonth = () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    }).filter((d) => d >= weekStart);
    requestApply(
      monthDays,
      `Horaires appliqués au reste de ${format(currentMonth, "MMMM yyyy", { locale: fr })}.`
    );
  };

  const applyToRange = (endValue: string) => {
    if (!endValue) return;
    const end = parseISO(endValue);
    const start = weekDays[0];
    if (end < start) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure au début de la semaine.",
        variant: "destructive",
      });
      return;
    }
    requestApply(
      eachDayOfInterval({ start, end }),
      `Horaires appliqués jusqu'au ${format(end, "d MMMM yyyy", { locale: fr })}.`
    );
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const next = addDays(selectedWeek, direction === "next" ? 7 : -7);
    setSelectedWeek(next);
    if (format(next, "yyyy-MM") !== format(currentMonth, "yyyy-MM")) setCurrentMonth(next);
  };

  // ===== Sauvegarde =====
  const saveAvailability = useCallback(async (): Promise<boolean> => {
    const keys = Object.keys(localDays);
    if (keys.length === 0) {
      toast({ title: "Aucune modification", description: "Rien à sauvegarder." });
      return true;
    }

    setIsSaving(true);
    try {
      const payload = keys.map((key) => ({
        date: key,
        open_times: gridForDate(parseISO(key)).filter((t) => localDays[key].includes(t)),
      }));

      const { data, error } = await supabase.rpc("save_availability", { p_days: payload });
      if (error) throw error;

      setLocalDays({});
      // Invalide uniquement la fenêtre courante et purge les anciennes entrées du cache
      await queryClient.invalidateQueries({ queryKey: ["availability", startKey, endKey] });
      queryClient.removeQueries({
        queryKey: ["availability"],
        predicate: (q) => q.queryKey[1] !== startKey || q.queryKey[2] !== endKey,
      });

      toast({
        title: "Sauvegarde réussie",
        description: `${data ?? keys.length} jour(s) enregistré(s).`,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Veuillez réessayer.";
      toast({ title: "Erreur de sauvegarde", description: message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [localDays, queryClient, toast, startKey, endKey]);

  const saveRef = useRef(saveAvailability);
  saveRef.current = saveAvailability;
  useEffect(() => {
    registerSaveHandler?.(() => saveRef.current());
    return () => registerSaveHandler?.(null);
  }, [registerSaveHandler]);

  // ===== Raccourcis clavier =====
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const delta = e.key === "ArrowRight" ? 7 : -7;
        setSelectedWeek((prev) => {
          const next = addDays(prev, delta);
          setCurrentMonth((m) => (format(next, "yyyy-MM") !== format(m, "yyyy-MM") ? next : m));
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ===== Sélection multiple par glisser-déposer =====
  interface FlatSlot { key: string; day: Date; time: string; reserved: boolean; available: boolean }
  interface DragState { startIdx: number; currentIdx: number; target: boolean }

  const flatSlotsRef = useRef<FlatSlot[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [dragSelection, setDragSelection] = useState<DragState | null>(null);

  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragSelection(d);
  };

  const applyDragSelection = (d: DragState) => {
    const slots = flatSlotsRef.current;
    const a = Math.min(d.startIdx, d.currentIdx);
    const b = Math.max(d.startIdx, d.currentIdx);
    const range = slots.slice(a, b + 1).filter((s) => !s.reserved && !isBlockedDay(s.day));
    if (range.length === 0) return;

    const byDay = new Map<string, { day: Date; times: Set<string> }>();
    range.forEach((s) => {
      const key = toKey(s.day);
      if (!byDay.has(key)) byDay.set(key, { day: s.day, times: new Set() });
      byDay.get(key)!.times.add(s.time);
    });

    const patch: Record<string, string[]> = {};
    byDay.forEach(({ day, times }, key) => {
      const open = new Set(openTimesOf(day));
      times.forEach((t) => (d.target ? open.add(t) : open.delete(t)));
      patch[key] = gridForDate(day).filter((t) => open.has(t));
    });
    patchDays(patch);

    if (range.length > 1) {
      toast({
        title: `${range.length} créneaux ${d.target ? "ouverts" : "fermés"}`,
        description: "Sélection multiple appliquée.",
      });
    }
  };

  useEffect(() => {
    if (!dragSelection) return;

    const onMove = (e: PointerEvent) => {
      const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
        "[data-slot-index]"
      );
      if (el) {
        const idx = Number(el.getAttribute("data-slot-index"));
        const cur = dragRef.current;
        if (cur && cur.currentIdx !== idx) setDrag({ ...cur, currentIdx: idx });
      }
    };
    const onUp = () => {
      if (dragRef.current) applyDragSelection(dragRef.current);
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragSelection !== null]);

  // ===== Données de rendu =====
  const weekData = weekDays.map(getDay);

  const flatSlots: FlatSlot[] = weekData.flatMap((day) =>
    day.timeSlots.map((slot) => ({
      key: `${toKey(day.date)}_${slot.time}`,
      day: day.date,
      time: slot.time,
      reserved: !!slot.reserved,
      available: slot.available,
    }))
  );
  flatSlotsRef.current = flatSlots;
  const flatIndexByKey = new Map(flatSlots.map((s, i) => [s.key, i]));

  const dragSelectedKeys = new Set<string>();
  if (dragSelection) {
    const a = Math.min(dragSelection.startIdx, dragSelection.currentIdx);
    const b = Math.max(dragSelection.startIdx, dragSelection.currentIdx);
    flatSlots.slice(a, b + 1).forEach((s) => {
      if (!s.reserved) dragSelectedKeys.add(s.key);
    });
  }

  const openDaysCount = weekData.filter((d) => d.timeSlots.some((s) => s.available)).length;

  const weekFillRate = (() => {
    let open = 0;
    let reserved = 0;
    weekData.forEach((day) =>
      day.timeSlots.forEach((slot) => {
        if (slot.available) {
          open++;
          if (slot.reserved) reserved++;
        }
      })
    );
    return open > 0 ? Math.round((reserved / open) * 100) : 0;
  })();

  const showSkeleton = isFetching && !serverDays;

  // Résumé de la saison (1er octobre -> 31 janvier)
  const seasonSummary = useMemo(() => {
    let days = 0;
    let openSlots = 0;
    let reservedSlots = 0;
    eachDayOfInterval({ start: season.start, end: season.end }).forEach((d) => {
      const key = toKey(d);
      const server = serverDays?.[key];
      const grid = gridForDate(d);
      if (grid.length === 0) return;
      const open = new Set(localDays[key] ?? server?.open ?? []);
      const reserved = new Set(server?.reserved ?? []);
      if (server?.blocked) return;
      const dayOpen = grid.filter((t) => open.has(t));
      if (dayOpen.length === 0) return;
      days++;
      openSlots += dayOpen.length;
      reservedSlots += dayOpen.filter((t) => reserved.has(t)).length;
    });
    return { days, openSlots, reservedSlots };
  }, [season, serverDays, localDays]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="sticky top-0 z-10 border-b bg-background">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">Gestion par Semaine</CardTitle>
              <CardDescription>
                Configurez rapidement les disponibilités pour une semaine entière
              </CardDescription>
              <p className="mt-1 text-sm text-muted-foreground">
                Saison {seasonLabel(today)} : {seasonSummary.days} jours ouverts,{" "}
                {seasonSummary.openSlots} créneaux ouverts, {seasonSummary.reservedSlots} réservés
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isFetching && !showSkeleton && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-sm font-medium">Taux de remplissage:</div>
                <Badge
                  variant={weekFillRate >= 80 ? "destructive" : weekFillRate >= 50 ? "default" : "secondary"}
                >
                  {weekFillRate}%
                </Badge>
              </div>

              {hasUnsavedChanges && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => setLocalDays({})}
                >
                  <Undo2 className="h-4 w-4" />
                  Annuler les modifications
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={saveAvailability}
                disabled={isSaving || !hasUnsavedChanges}
                className="h-9 gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>
                  {isSaving
                    ? "Sauvegarde..."
                    : `Sauvegarder${hasUnsavedChanges ? ` (${dirtyKeys.length} jours)` : ""}`}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-3">
            {/* Navigation */}
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center justify-between gap-2 md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Semaine précédente"
                  title="Semaine précédente"
                  onClick={() => navigateWeek("prev")}
                  className="h-9 min-w-[44px] px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-center">
                  <p className="font-medium">
                    Semaine du{" "}
                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM", { locale: fr })} au{" "}
                    {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">{openDaysCount}/6 jours ouverts</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Semaine suivante"
                  title="Semaine suivante"
                  onClick={() => navigateWeek("next")}
                  className="h-9 min-w-[44px] px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => {
                    const now = new Date();
                    setSelectedWeek(now);
                    setCurrentMonth(now);
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Aujourd'hui
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => {
                    setSelectedWeek(season.start);
                    setCurrentMonth(season.start);
                  }}
                >
                  <Flag className="h-4 w-4" />
                  Début de saison
                </Button>

                <input
                  type="date"
                  aria-label="Aller à la semaine du"
                  value={format(selectedWeek, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const d = parseISO(e.target.value);
                    setSelectedWeek(d);
                    setCurrentMonth(d);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
            </div>

            {/* Actions de la semaine */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase text-muted-foreground">Cette semaine</span>

              <Button
                variant="outline"
                size="sm"
                onClick={applyDefaultToWeek}
                className="h-9 gap-2 max-md:w-full"
              >
                <CalendarCheck className="h-4 w-4" />
                Tout ouvrir
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={closeWeek}
                className="h-9 gap-2 hover:bg-destructive/10 hover:text-destructive max-md:w-full"
              >
                <CalendarX className="h-4 w-4" />
                Tout fermer
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={copyPreviousWeek}
                className="h-9 gap-2 max-md:w-full"
              >
                <Copy className="h-4 w-4" />
                Copier la semaine précédente
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2 max-md:w-full">
                    <Repeat className="h-4 w-4" />
                    Reproduire cette semaine…
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => applyToMonth()}>
                    Sur le reste du mois
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => applyToRange(format(season.end, "yyyy-MM-dd"))}
                  >
                    Jusqu'à la fin de saison (31 janvier)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setCustomOpen(true);
                    }}
                  >
                    Jusqu'à une date…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                  <span />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto space-y-2 p-3">
                  <input
                    type="date"
                    aria-label="Reproduire jusqu'au"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-9 w-full"
                    disabled={!customDate}
                    onClick={() => {
                      setCustomOpen(false);
                      applyToRange(customDate);
                    }}
                  >
                    Valider
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {showSkeleton ? (
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-2">
                  <Skeleton className="h-3 w-10 mx-auto" />
                  <Skeleton className="h-4 w-6 mx-auto" />
                  {Array.from({ length: 10 }).map((__, j) => (
                    <Skeleton key={j} className="h-6 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 select-none">
              {weekData.map((dayAvailability) => {
                const day = dayAvailability.date;
                const availableSlots = dayAvailability.timeSlots.filter((s) => s.available).length;

                return (
                  <div
                    key={toKey(day)}
                    className="p-2 rounded-lg border border-border text-center transition-colors hover:border-primary/50"
                  >
                    <div className="text-xs font-medium">{format(day, "EEE", { locale: fr })}</div>
                    <div className="text-sm font-bold mb-2">{format(day, "d", { locale: fr })}</div>

                    <div className="flex items-center justify-center mb-2">
                      {dayAvailability.blocked ? (
                        <Badge variant="destructive" className="text-xs">
                          Bloqué
                        </Badge>
                      ) : availableSlots > 0 ? (
                        <Badge variant="default" className="text-xs">
                          {availableSlots} créneaux
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Fermé
                        </Badge>
                      )}
                    </div>

                    {dayAvailability.blocked && (
                      <div className="text-xs text-destructive text-center">
                        {dayAvailability.blockActivity}
                      </div>
                    )}

                    {!dayAvailability.blocked && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          {availableSlots}/{dayAvailability.timeSlots.length}
                        </div>

                        <div className="space-y-1">
                          {dayAvailability.timeSlots.map((slot) => {
                            const slotKey = `${toKey(day)}_${slot.time}`;
                            const flatIndex = flatIndexByKey.get(slotKey) ?? -1;
                            const isDragSelected = dragSelectedKeys.has(slotKey);

                            let buttonVariant: "success" | "secondary" | "destructive" = "secondary";
                            let buttonClass = "text-xs h-6 w-full select-none touch-none";
                            const isDisabled = !!slot.reserved;

                            if (slot.reserved) {
                              buttonVariant = "destructive";
                              buttonClass += " opacity-75";
                            } else if (slot.available) {
                              buttonVariant = "success";
                            }

                            if (isDragSelected) {
                              buttonClass +=
                                " ring-2 ring-primary ring-offset-1 ring-offset-background brightness-110";
                            }

                            return (
                              <div key={slot.time} data-slot-index={flatIndex}>
                                <Button
                                  variant={buttonVariant}
                                  size="sm"
                                  className={buttonClass}
                                  onPointerDown={(e) => {
                                    if (isDisabled || flatIndex < 0) return;
                                    e.preventDefault();
                                    setDrag({
                                      startIdx: flatIndex,
                                      currentIdx: flatIndex,
                                      target: !slot.available,
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                                      e.preventDefault();
                                      toggleTimeSlot(day, slot.time);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  title={
                                    slot.reserved
                                      ? "Créneau réservé"
                                      : slot.available
                                        ? "Créneau disponible"
                                        : "Créneau fermé"
                                  }
                                >
                                  {slot.time}
                                  {slot.reserved && <span className="ml-1 text-xs">📅</span>}
                                </Button>
                                {slot.time === "12:15" && (
                                  <div className="flex items-center gap-2 py-2">
                                    <div className="flex-1 border-t border-muted-foreground/30"></div>
                                    <span className="text-xs text-muted-foreground px-2">Pause déjeuner</span>
                                    <div className="flex-1 border-t border-muted-foreground/30"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingApply} onOpenChange={(o) => !o && setPendingApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reproduire les horaires de cette semaine sur {pendingApply?.days.length ?? 0} jours ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les horaires existants de ces jours seront remplacés ; les créneaux déjà réservés et
              les jours bloqués ne sont pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
