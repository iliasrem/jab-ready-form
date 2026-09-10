import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";

// Saison de vaccination : du 1er octobre au 31 janvier inclus.
export const SEASON_START = { month: 10, day: 1 } as const;
export const SEASON_END = { month: 1, day: 31 } as const;

export interface SeasonRange {
  start: Date;
  end: Date;
}

/**
 * Renvoie la plage de la saison de vaccination pour une date de référence.
 * La saison passée reste active jusqu'au 31 mars :
 * - Octobre à décembre : saison de cette année (1er oct -> 31 jan suivant).
 * - Janvier à mars : saison commencée l'année précédente.
 * - Avril à septembre : saison à venir (1er oct de l'année en cours -> 31 jan suivant).
 */
export function getSeasonRange(referenceDate: Date = new Date()): SeasonRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  let startYear: number;
  if (month >= SEASON_START.month) {
    startYear = year;
  } else if (month <= 3) {
    startYear = year - 1;
  } else {
    // Avril -> septembre : on vise la saison à venir
    startYear = year;
  }

  return {
    start: new Date(startYear, SEASON_START.month - 1, SEASON_START.day),
    end: new Date(startYear + 1, SEASON_END.month - 1, SEASON_END.day),
  };
}

export function seasonLabel(referenceDate: Date = new Date()): string {
  const { start } = getSeasonRange(referenceDate);
  const y = start.getFullYear();
  return `${y}-${y + 1}`;
}

/**
 * Fenêtre de chargement stable pour la navigation :
 * base = saison(aujourd'hui) élargie au mois courant, puis extension par pas
 * de 3 mois si le mois visualisé (± 1 mois) sort de la fenêtre. Les pas de
 * 3 mois garantissent une clé de cache stable pendant la navigation.
 */
export function getStableWindow(today: Date, viewed: Date): SeasonRange {
  const season = getSeasonRange(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  let start = monthStart < season.start ? monthStart : season.start;
  let end = monthEnd > season.end ? monthEnd : season.end;

  const viewedMin = startOfMonth(subMonths(viewed, 1));
  while (viewedMin < start) {
    start = startOfMonth(subMonths(start, 3));
  }

  const viewedMax = endOfMonth(addMonths(viewed, 1));
  while (viewedMax > end) {
    end = endOfMonth(addMonths(end, 3));
  }

  return { start, end };
}
