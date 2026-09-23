export const DEFAULT_ADMIN_TAB_ORDER = [
  "vaccination",
  "vaccine-holds",
  "calendar",
  "appointments",
  "pharmacy-booking",
  "utilities",
] as const;

export type AdminTabId = (typeof DEFAULT_ADMIN_TAB_ORDER)[number];

export const ADMIN_TAB_LABELS: Record<AdminTabId, string> = {
  vaccination: "Vaccination",
  "vaccine-holds": "Vaccins réservés",
  calendar: "RDV du jour",
  appointments: "Tous les RDV",
  "pharmacy-booking": "RDV via pharmacie",
  utilities: "Utilitaires",
};

export const ADMIN_TAB_ORDER_STORAGE_KEY = "admin-tab-order";

export function normalizeAdminTabOrder(value: unknown): AdminTabId[] {
  const validTabs = new Set<AdminTabId>(DEFAULT_ADMIN_TAB_ORDER);
  const storedTabs = Array.isArray(value)
    ? value.filter((tab): tab is AdminTabId => typeof tab === "string" && validTabs.has(tab as AdminTabId))
    : [];
  const uniqueStoredTabs = [...new Set(storedTabs)];

  return [
    ...uniqueStoredTabs,
    ...DEFAULT_ADMIN_TAB_ORDER.filter((tab) => !uniqueStoredTabs.includes(tab)),
  ];
}