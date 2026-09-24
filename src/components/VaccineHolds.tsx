import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { capitalizeName, cleanPhone } from "@/lib/utils";
import { normalizePhoneNumber } from "@/components/AppointmentForm";
import { format } from "date-fns";
import { PackageCheck, Plus, Search, Loader2, Trash2, Phone, Undo2 } from "lucide-react";

interface PatientLite {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birth_date: string | null;
}

interface VaccineLite {
  id: string;
  name: string;
}

interface Hold {
  id: string;
  patient_id: string;
  vaccine_id: string | null;
  reservation_date: string;
  status: "reserved" | "collected";
  collected_at: string | null;
  notes: string | null;
  patients: PatientLite | null;
  vaccines: { name: string } | null;
}

const PATIENT_FIELDS = "id, first_name, last_name, phone, birth_date";

// JJ/MM/AAAA -> AAAA-MM-JJ (ou null si invalide)
const parseBirthDate = (value: string): string | null => {
  const m = value.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  if (date > new Date()) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const formatBirthInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const fmtDate = (iso: string | null) => (iso ? format(new Date(`${iso.slice(0, 10)}T00:00:00`), "dd/MM/yyyy") : "—");

const byName = (a: PatientLite | null, b: PatientLite | null) =>
  `${a?.last_name ?? ""} ${a?.first_name ?? ""}`.localeCompare(`${b?.last_name ?? ""} ${b?.first_name ?? ""}`, "fr", {
    sensitivity: "base",
  });

// Champ téléphone éditable directement dans la liste (Entrée = enregistrer, Échap = vider)
const InlinePhoneInput = ({
  patientId,
  onSaved,
}: {
  patientId: string;
  onSaved: (patientId: string, raw: string) => Promise<boolean>;
}) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    const ok = await onSaved(patientId, value);
    setSaving(false);
    if (ok) setValue("");
  };

  return (
    <div className="relative w-40">
      <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      <Input
        type="tel"
        inputMode="tel"
        value={value}
        disabled={saving}
        placeholder="Ajouter un n°"
        aria-label="Ajouter un numéro de téléphone"
        className="h-8 pl-6 pr-7 text-sm border-dashed"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => submit()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            if (e.key === "Enter") e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setValue("");
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {saving && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}

    </div>
  );
};

export const VaccineHolds = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [holds, setHolds] = useState<Hold[]>([]);
  const [vaccines, setVaccines] = useState<VaccineLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollected, setShowCollected] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<PatientLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ last_name: "", first_name: "", birth_date: "", phone: "" });
  const [creating, setCreating] = useState(false);

  const [toDelete, setToDelete] = useState<Hold | null>(null);

  const fetchHolds = useCallback(async () => {
    const all: Hold[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("vaccine_holds")
        .select(
          `id, patient_id, vaccine_id, reservation_date, status, collected_at, notes, patients:patient_id (${PATIENT_FIELDS}), vaccines:vaccine_id (name)`
        )
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error(error);
        toast({ title: "Erreur", description: "Impossible de charger les réservations", variant: "destructive" });
        break;
      }
      all.push(...((data as unknown as Hold[]) || []));
      if (!data || data.length < pageSize) break;
    }
    setHolds(all);
    setLoading(false);
  }, []);

  const fetchVaccines = useCallback(async () => {
    const { data, error } = await supabase
      .from("vaccines")
      .select("id, name")
      .eq("is_available", true)
      .order("name");
    if (error) {
      console.error(error);
      return;
    }
    setVaccines((data as VaccineLite[]) || []);
  }, []);

  useEffect(() => {
    fetchHolds();
    fetchVaccines();
  }, [fetchHolds, fetchVaccines]);

  const activeHolds = useMemo(
    () => holds.filter((h) => h.status === "reserved").sort((a, b) => byName(a.patients, b.patients)),
    [holds]
  );
  const collectedHolds = useMemo(
    () => holds.filter((h) => h.status === "collected").sort((a, b) => byName(a.patients, b.patients)),
    [holds]
  );
  const reservedPatientIds = useMemo(() => new Set(activeHolds.map((h) => h.patient_id)), [activeHolds]);
  const countsByVaccine = useMemo(() => {
    const m = new Map<string, number>();
    activeHolds.forEach((h) => {
      const name = h.vaccines?.name ?? "Non précisé";
      m.set(name, (m.get(name) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [activeHolds]);

  // Recherche côté serveur (nom, prénom, date de naissance, téléphone)
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const birthDate = parseBirthDate(term);
        let query = supabase.from("patients").select(PATIENT_FIELDS).order("last_name").limit(50);
        if (birthDate) {
          query = query.eq("birth_date", birthDate);
        } else {
          const safe = term.replace(/[,()]/g, " ");
          const digits = term.replace(/[\s\-.()/]/g, "");
          const filters = [`first_name.ilike.%${safe}%`, `last_name.ilike.%${safe}%`];
          if (/^\+?\d{3,}$/.test(digits)) filters.push(`phone.ilike.%${digits.replace(/^\+/, "")}%`);
          query = query.or(filters.join(","));
        }
        const { data } = await query;
        let list = (data || []) as PatientLite[];

        const words = term.split(/\s+/).filter(Boolean);
        if (!birthDate && words.length >= 2) {
          const [{ data: a }, { data: b }] = await Promise.all([
            supabase.from("patients").select(PATIENT_FIELDS).ilike("last_name", `%${words[0]}%`).ilike("first_name", `%${words.slice(1).join(" ")}%`).limit(50),
            supabase.from("patients").select(PATIENT_FIELDS).ilike("first_name", `%${words[0]}%`).ilike("last_name", `%${words.slice(1).join(" ")}%`).limit(50),
          ]);
          const merged = [...list, ...((a || []) as PatientLite[]), ...((b || []) as PatientLite[])];
          list = Array.from(new Map(merged.map((p) => [p.id, p])).values());
        }
        list.sort(byName);
        setResults(list);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const reserveFor = async (patient: PatientLite, vaccine: VaccineLite) => {
    if (reservedPatientIds.has(patient.id)) {
      toast({ title: "Déjà réservé", description: `${capitalizeName(patient.last_name)} ${capitalizeName(patient.first_name)} a déjà un vaccin réservé.` });
      return;
    }
    setBusyId(patient.id);
    const { error } = await supabase.from("vaccine_holds").insert({ patient_id: patient.id, vaccine_id: vaccine.id });
    setBusyId(null);
    if (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: error.code === "23505" ? "Ce patient a déjà un vaccin réservé." : "Impossible d'enregistrer la réservation",
        variant: "destructive",
      });
      return;
    }
    toast({ title: `${vaccine.name} réservé`, description: `${capitalizeName(patient.last_name)} ${capitalizeName(patient.first_name)}` });
    setSearchTerm("");
    setResults([]);
    fetchHolds();
  };

  const openNewPatient = () => {
    const term = searchTerm.trim();
    const words = term.split(/\s+/).filter(Boolean);
    const isName = term && !/\d/.test(term);
    setNewForm({
      last_name: isName ? capitalizeName(words[0] || "") : "",
      first_name: isName ? capitalizeName(words.slice(1).join(" ")) : "",
      birth_date: parseBirthDate(term) ? term : "",
      phone: !isName && /^\+?[\d\s\-.()/]{6,}$/.test(term) ? term : "",
    });
    setNewOpen(true);
  };

  const birthError =
    newForm.birth_date && newForm.birth_date.length === 10 && !parseBirthDate(newForm.birth_date)
      ? "Date invalide"
      : newForm.birth_date && newForm.birth_date.length > 0 && newForm.birth_date.length < 10
      ? "Format attendu : JJ/MM/AAAA"
      : "";

  const createPatientAndReserve = async (vaccine: VaccineLite) => {
    const last = capitalizeName(newForm.last_name);
    const first = capitalizeName(newForm.first_name);
    if (!last || !first) {
      toast({ title: "Champs manquants", description: "Nom et prénom sont obligatoires", variant: "destructive" });
      return;
    }
    const birth = newForm.birth_date ? parseBirthDate(newForm.birth_date) : null;
    if (newForm.birth_date && !birth) {
      toast({ title: "Date de naissance invalide", description: "Format attendu : JJ/MM/AAAA", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          last_name: last,
          first_name: first,
          birth_date: birth,
          phone: cleanPhone(newForm.phone),
          status: "active",
          user_id: user?.id ?? null,
        })
        .select(PATIENT_FIELDS)
        .single();
      if (error || !patient) throw error;

      const { error: holdErr } = await supabase
        .from("vaccine_holds")
        .insert({ patient_id: patient.id, vaccine_id: vaccine.id });
      if (holdErr) throw holdErr;

      toast({ title: `Patient ajouté – ${vaccine.name} réservé`, description: `${last} ${first}` });
      setNewOpen(false);
      setSearchTerm("");
      setResults([]);
      fetchHolds();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible d'ajouter le patient", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const setCollected = async (hold: Hold, collected: boolean) => {
    setBusyId(hold.id);
    const { error } = await supabase
      .from("vaccine_holds")
      .update({ status: collected ? "collected" : "reserved", collected_at: collected ? new Date().toISOString() : null })
      .eq("id", hold.id);
    setBusyId(null);
    if (error) {
      toast({
        title: "Erreur",
        description: error.code === "23505" ? "Ce patient a déjà une autre réservation active." : "Mise à jour impossible",
        variant: "destructive",
      });
      return;
    }
    toast({ title: collected ? "Vaccin remis au patient" : "Réservation réactivée" });
    fetchHolds();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("vaccine_holds").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) {
      toast({ title: "Erreur", description: "Suppression impossible", variant: "destructive" });
      return;
    }
    toast({ title: "Réservation supprimée" });
    fetchHolds();
  };

  // Enregistre le téléphone dans la fiche patient et met à jour la liste localement
  const savePatientPhone = async (patientId: string, raw: string): Promise<boolean> => {
    const phone = normalizePhoneNumber(raw);
    if (!phone) {
      toast({
        title: "Numéro invalide",
        description: "Ex. 0471 12 34 56 ou +33 6 12 34 56 78.",
        variant: "destructive",
      });
      return false;
    }
    const { data, error } = await supabase
      .from("patients")
      .update({ phone })
      .eq("id", patientId)
      .select("id, phone");
    if (error || !data || data.length === 0) {
      console.error("phone update failed", error);
      toast({
        title: "Erreur",
        description: error?.message ?? "Le numéro n'a pas pu être enregistré (fiche patient introuvable ou accès refusé).",
        variant: "destructive",
      });
      return false;
    }
    setHolds((prev) =>
      prev.map((x) => (x.patient_id === patientId && x.patients ? { ...x, patients: { ...x.patients, phone } } : x))
    );
    toast({ title: "Téléphone enregistré", description: phone });
    return true;
  };


  const renderRows = (list: Hold[], collected: boolean) =>
    list.map((h) => (
      <TableRow key={h.id}>
        <TableCell className="font-semibold">{capitalizeName(h.patients?.last_name ?? "")}</TableCell>
        <TableCell>{capitalizeName(h.patients?.first_name ?? "")}</TableCell>
        <TableCell className="tabular-nums">{fmtDate(h.patients?.birth_date ?? null)}</TableCell>
        <TableCell>
          {h.patients?.phone ? (
            <a href={`tel:${h.patients.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-3 w-3" />
              {h.patients.phone}
            </a>
          ) : (
            <InlinePhoneInput patientId={h.patient_id} onSaved={savePatientPhone} />
          )}
        </TableCell>
        <TableCell>
          {h.vaccines?.name ? <Badge variant="outline">{h.vaccines.name}</Badge> : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="tabular-nums">{fmtDate(h.reservation_date)}</TableCell>
        {collected && (
          <TableCell className="tabular-nums">
            {h.collected_at ? format(new Date(h.collected_at), "dd/MM/yyyy") : "—"}
          </TableCell>
        )}
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {collected && (
              <Button size="sm" variant="outline" disabled={busyId === h.id} onClick={() => setCollected(h, false)}>
                <Undo2 className="h-4 w-4 mr-1" />
                Réactiver
              </Button>
            )}
            {!collected && (
              <Button
                size="sm"
                variant="outline"
                className="text-primary hover:bg-primary/10"
                disabled={busyId === h.id}
                onClick={() => setCollected(h, true)}
                aria-label="Remis au patient"
                title="Remis au patient"
              >
                <PackageCheck className="h-4 w-4 mr-1" />
                Remis au patient
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setToDelete(h)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="space-y-6">
      {/* En-tête avec compteur à droite */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-primary" />
            Vaccins réservés
          </h2>
          <p className="text-sm text-muted-foreground">
            Réservations sans rendez-vous en prévision de la pénurie.
          </p>
        </div>
        <Card className="bg-primary/10 border-primary/30 sm:min-w-[16rem]">
          <CardContent className="py-3 px-5 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium leading-tight">
                Vaccins à mettre
                <br />
                de côté
              </div>
              <div className="text-4xl font-bold text-primary tabular-nums">{loading ? "…" : activeHolds.length}</div>
            </div>
            {!loading && countsByVaccine.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-primary/20 pt-2">
                {countsByVaccine.map(([name, n]) => (
                  <Badge key={name} variant="secondary" className="tabular-nums">
                    {name} : {n}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recherche + ajout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ajouter une réservation</CardTitle>
          <CardDescription>Recherchez par nom, prénom, date de naissance (JJ/MM/AAAA) ou téléphone. Le « + » crée un nouveau patient.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un patient…"
              className="pl-9 pr-12 h-11"
            />
            <Button
              type="button"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
              onClick={openNewPatient}
              aria-label="Nouveau patient"
              title="Nouveau patient"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {searchTerm.trim().length >= 2 && (
            <div className="rounded-md border">
              {searching ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Recherche…
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground flex items-center justify-between gap-2">
                  Aucun patient trouvé.
                  <Button size="sm" variant="outline" onClick={openNewPatient}>
                    <Plus className="h-4 w-4 mr-1" /> Nouveau patient
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Date de naissance</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((p) => {
                      const already = reservedPatientIds.has(p.id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-semibold">{capitalizeName(p.last_name)}</TableCell>
                          <TableCell>{capitalizeName(p.first_name)}</TableCell>
                          <TableCell className="tabular-nums">{fmtDate(p.birth_date)}</TableCell>
                          <TableCell>{p.phone || "—"}</TableCell>
                          <TableCell className="text-right">
                            {already ? (
                              <Badge variant="secondary">Déjà réservé</Badge>
                            ) : busyId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin inline-block" />
                            ) : vaccines.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Aucun vaccin disponible</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {vaccines.map((v) => (
                                  <Button key={v.id} size="sm" disabled={!!busyId} onClick={() => reserveFor(p, v)}>
                                    {v.name}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des réservations */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-lg">Liste des réservations ({activeHolds.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Switch id="show-collected" checked={showCollected} onCheckedChange={setShowCollected} />
            <Label htmlFor="show-collected" className="text-sm">
              Afficher les vaccins remis ({collectedHolds.length})
            </Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : activeHolds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun vaccin réservé pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Vaccin</TableHead>
                  <TableHead>Réservé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(activeHolds, false)}</TableBody>
            </Table>
          )}

          {showCollected && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Vaccins déjà remis</h3>
              {collectedHolds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Date de naissance</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Vaccin</TableHead>
                      <TableHead>Réservé le</TableHead>
                      <TableHead>Remis le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderRows(collectedHolds, true)}</TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nouveau patient */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau patient</DialogTitle>
            <DialogDescription>Le patient sera ajouté à la liste des patients et son vaccin réservé.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hold-last">Nom *</Label>
              <Input id="hold-last" value={newForm.last_name} onChange={(e) => setNewForm({ ...newForm, last_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hold-first">Prénom *</Label>
              <Input id="hold-first" value={newForm.first_name} onChange={(e) => setNewForm({ ...newForm, first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hold-birth">Date de naissance</Label>
              <Input
                id="hold-birth"
                inputMode="numeric"
                placeholder="JJ/MM/AAAA"
                value={newForm.birth_date}
                onChange={(e) => setNewForm({ ...newForm, birth_date: formatBirthInput(e.target.value) })}
              />
              {birthError && <p className="text-xs text-destructive">{birthError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hold-phone">Téléphone</Label>
              <Input id="hold-phone" type="tel" value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:items-center">
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Annuler
            </Button>
            <span className="text-sm text-muted-foreground sm:ml-auto">Ajouter et réserver :</span>
            {vaccines.length === 0 ? (
              <span className="text-sm text-destructive">Aucun vaccin disponible</span>
            ) : (
              vaccines.map((v) => (
                <Button
                  key={v.id}
                  onClick={() => createPatientAndReserve(v)}
                  disabled={creating || !newForm.last_name.trim() || !newForm.first_name.trim() || !!birthError}
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {v.name}
                </Button>
              ))
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.patients
                ? `La réservation de ${capitalizeName(toDelete.patients.last_name)} ${capitalizeName(toDelete.patients.first_name)} sera supprimée. Le patient reste dans la liste des patients.`
                : "La réservation sera supprimée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
