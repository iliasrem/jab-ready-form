/**
 * Validation des formats de téléphone pour les numéros belges, français et italiens
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valide un numéro de téléphone selon les formats autorisés :
 * - GSM belge : 04XX XX XX XX ou +32 4XX XX XX XX
 * - Fixe belge : 0X XX XX XX XX (pas 04) ou +32 X XX XX XX XX  
 * - Mobile français : 06/07 XX XX XX XX ou +33 6/7 XX XX XX XX
 * - Mobile italien : 3XX XXX XXXX ou +39 3XX XXX XXXX
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: "Le numéro de téléphone est obligatoire." };
  }

  // Nettoyer le numéro (supprimer espaces, tirets, parenthèses, points)
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

  // Vérifier que le numéro ne contient que des chiffres et éventuellement un + au début
  if (!/^\+?\d+$/.test(cleanPhone)) {
    return { isValid: false, error: "Le numéro de téléphone ne doit contenir que des chiffres." };
  }

  // GSM belge avec indicatif international
  if (/^\+324\d{8}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // GSM belge format national
  if (/^04\d{8}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // Fixe belge avec indicatif international (pas 04)
  if (/^\+32[1-9]\d{7}$/.test(cleanPhone) && !cleanPhone.startsWith('+324')) {
    return { isValid: true };
  }

  // Fixe belge format national (pas 04)
  if (/^0[1-35-9]\d{7}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // Mobile français avec indicatif international
  if (/^\+33[67]\d{8}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // Mobile français format national
  if (/^0[67]\d{8}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // Mobile italien avec indicatif international
  if (/^\+393\d{8,9}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  // Mobile italien format national
  if (/^3\d{8,9}$/.test(cleanPhone)) {
    return { isValid: true };
  }

  return { 
    isValid: false, 
    error: "Format invalide. Formats acceptés : GSM belge (04XX XX XX XX), fixe belge, mobile français (06/07), mobile italien (3XX)." 
  };
}