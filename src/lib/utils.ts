import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fonction pour formater une date en YYYY-MM-DD sans conversion UTC
export function formatDateForDb(date: Date): string {
  // Vérifier si la date est valide
  if (isNaN(date.getTime())) {
    throw new Error('Date invalide fournie à formatDateForDb');
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Fonction pour formater une heure au format HH:MM (sans les secondes)
export function formatTimeForDisplay(timeString: string): string {
  return timeString.slice(0, 5); // Garde seulement HH:MM
}
