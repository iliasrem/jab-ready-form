export const DEFAULT_ADMIN_TAB_ORDER = [
  "vaccination",
  "vaccine-holds",
  "calendar",
  "appointments",
  "pharmacy-booking",
  "inventory",
  "utilities",
] as const;

export type AdminTabId = (typeof DEFAULT_ADMIN_TAB_ORDER)[number];

export const ADMIN_TAB_LABELS: Record<AdminTabId, string> = {
  vaccination: "Vaccination",
  "vaccine-holds": "Réservation de vaccin",
  calendar: "RDV du jour",
  appointments: "Tous les RDV",
  "pharmacy-booking": "RDV via pharmacie",
  inventory: "Inventaire",
  utilities: "Utilitaires",
};


export const ADMIN_TAB_ORDER_STORAGE_KEY = "admin-tab-order";
export const ADMIN_HIDDEN_TABS_STORAGE_KEY = "admin-hidden-tabs";

/** Onglet toujours visible : il contient les paramètres. */
export const ALWAYS_VISIBLE_ADMIN_TAB: AdminTabId = "utilities";

export function normalizeHiddenAdminTabs(value: unknown): AdminTabId[] {
  const validTabs = new Set<AdminTabId>(DEFAULT_ADMIN_TAB_ORDER);
  const hidden = Array.isArray(value)
    ? value.filter(
        (tab): tab is AdminTabId =>
          typeof tab === "string" && validTabs.has(tab as AdminTabId) && tab !== ALWAYS_VISIBLE_ADMIN_TAB,
      )
    : [];
  return [...new Set(hidden)];
}

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