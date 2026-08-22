import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface SeasonArchiveMeta {
  id: string;
  season_label: string;
  start_date: string;
  end_date: string;
  counts: Record<string, number>;
  archived_at: string;
}

export const COUNT_LABELS: Record<string, string> = {
  appointments: "rendez-vous",
  vaccinations: "vaccinations",
  makeup_appointments: "RDV rattrapage",
  vaccine_reservations: "réservations",
  vaccine_inventory: "lots",
  flu_vaccination_earnings: "relevés de gains",
};

// Une saison court du 1er septembre au 31 août.
export function currentSeasonLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function seasonCandidates(archived: string[]): string[] {
  const current = currentSeasonLabel();
  const startYear = parseInt(current.slice(0, 4), 10);
  const labels: string[] = [];
  // De 2024-2025 jusqu'à la saison en cours incluse
  for (let y = 2024; y <= startYear; y++) {
    const label = `${y}-${y + 1}`;
    if (!archived.includes(label)) labels.push(label);
  }
  return labels;
}

export function useSeasonArchives() {
  const [archives, setArchives] = useState<SeasonArchiveMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("season_archives")
      .select("*")
      .order("season_label", { ascending: false });
    if (error) {
      console.error("Erreur chargement archives:", error);
    } else {
      setArchives((data || []) as SeasonArchiveMeta[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { archives, loading, reload };
}
