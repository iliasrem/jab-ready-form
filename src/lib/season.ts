// Saison de vaccination : du 1er octobre au 31 janvier inclus.
export const SEASON_START = { month: 10, day: 1 } as const;
export const SEASON_END = { month: 1, day: 31 } as const;

export interface SeasonRange {
  start: Date;
  end: Date;
}

/**
 * Renvoie la plage de la saison de vaccination pour une date de référence.
 * - Octobre à décembre : saison en cours (1er oct de cette année -> 31 jan de l'année suivante).
 * - Janvier : saison en cours (1er oct de l'année précédente -> 31 jan de cette année).
 * - Février à septembre : saison à venir (1er oct de l'année en cours -> 31 jan suivant).
 */
export function getSeasonRange(referenceDate: Date = new Date()): SeasonRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  let startYear: number;
  if (month >= SEASON_START.month) {
    startYear = year;
  } else if (month === SEASON_END.month) {
    startYear = year - 1;
  } else {
    // Février -> septembre : on vise la saison à venir
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
