import { addDays, format } from "date-fns";

/**
 * Calcule la date de Pâques pour une année donnée (algorithme de Gauss)
 */
export const calculateEasterSunday = (year: number): Date => {
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

/**
 * Génère l'ensemble des jours fériés belges pour une année donnée
 */
export const getBelgianHolidays = (year: number): Set<string> => {
  const holidays = new Set<string>();
  const easter = calculateEasterSunday(year);
  
  const addHoliday = (date: Date) => {
    holidays.add(format(date, "yyyy-MM-dd"));
  };

  // Jours fériés fixes
  addHoliday(new Date(year, 0, 1));   // Jour de l'An
  addHoliday(new Date(year, 4, 1));   // Fête du Travail
  addHoliday(new Date(year, 6, 21));  // Fête nationale
  addHoliday(new Date(year, 7, 15));  // Assomption
  addHoliday(new Date(year, 10, 1));  // Toussaint
  addHoliday(new Date(year, 10, 11)); // Armistice
  addHoliday(new Date(year, 11, 25)); // Noël

  // Jours fériés mobiles (liés à Pâques)
  addHoliday(addDays(easter, 1));     // Lundi de Pâques
  addHoliday(addDays(easter, 39));    // Ascension
  addHoliday(addDays(easter, 50));    // Lundi de Pentecôte

  return holidays;
};

/**
 * Vérifie si une date est un jour férié belge
 */
export const isBelgianHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getBelgianHolidays(year);
  return holidays.has(format(date, "yyyy-MM-dd"));
};