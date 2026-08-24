import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { capitalizeName, cleanPhone } from "@/lib/utils";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

interface ParsedFile {
  headers: string[];
  rows: unknown[][];
  fileName: string;
}

interface Mapping {
  last: number;
  first: number;
  birth: number;
  phone: number;
  email: number;
}

interface ImportRow {
  lastName: string;
  firstName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
}

interface ResultRow extends ImportRow {
  status: "created" | "updated" | "unchanged" | "error";
  message?: string;
}

interface ImportStats {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  fileDupes: number;
  dbMerged: number;
}

const normalizeKey = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

const rowKey = (last: string, first: string) => `${normalizeKey(last)}|${normalizeKey(first)}`;

const toISODate = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getFullYear();
    if (y < 1900 || y > 2100) return null;
    return `${y}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    // Numéro de série Excel
    if (v > 20000 && v < 80000) {
      return toISODate(new Date(Math.round((v - 25569) * 86400 * 1000)));
    }
    return null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? (parseInt(m[3], 10) > 30 ? `19${m[3]}` : `20${m[3]}`) : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
};

const toPhone = (v: unknown): string | null => {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  if (/^\d+\.0$/.test(s)) s = s.slice(0, -2);
  return cleanPhone(s);
};

const toEmail = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s) ? s : null;
};

const formatDateDisplay = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const detectColumn = (headers: string[], patterns: RegExp[], exclude: number[] = []): number => {
  return headers.findIndex(
    (h, i) => !exclude.includes(i) && patterns.some((p) => p.test(String(h ?? "").toLowerCase().trim()))
  );
};

const formatETA = (done: number, total: number, start: number): string => {
  if (done === 0) return "calcul en cours…";
  const elapsed = Date.now() - start;
  const remaining = Math.round(((elapsed / done) * (total - done)) / 1000);
  if (remaining <= 0) return "presque terminé…";
  if (remaining < 60) return `≈ ${remaining} s`;
  return `≈ ${Math.floor(remaining / 60)} min ${String(remaining % 60).padStart(2, "0")} s`;
};

export const PatientImport = () => {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ last: -1, first: -1, birth: -1, phone: -1, email: -1 });
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: string } | null>(null);
  const startTimeRef = useRef(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
      const nonEmpty = raw.filter((r) => Array.isArray(r) && r.some((c) => c != null && String(c).trim() !== ""));
      if (nonEmpty.length < 2) {
        toast({ title: "Fichier vide", description: "Aucune ligne de données trouvée.", variant: "destructive" });
        return;
      }
      const headers = nonEmpty[0].map((h, i) => (h != null && String(h).trim() !== "" ? String(h).trim() : `Colonne ${i + 1}`));
      const first = detectColumn(headers, [/pr[ée]nom/, /first/]);
      const last = detectColumn(headers, [/^nom$/, /\bnom\b/, /last/, /name/], [first]);
      const birth = detectColumn(headers, [/naissance/, /birth/, /n[ée]?\(?e?\)? le/, /ddn/]);
      const phone = detectColumn(headers, [/t[ée]l/, /phone/, /gsm/, /mobile/, /portable/]);
      const email = detectColumn(headers, [/mail/, /courriel/]);
      setParsed({ headers, rows: nonEmpty.slice(1), fileName: file.name });
      setMapping({ last, first, birth, phone, email });
      setResults(null);
      setStats(null);
    } catch {
      toast({ title: "Erreur de lecture", description: "Impossible de lire ce fichier.", variant: "destructive" });
    }
  };

  const buildRows = (): ImportRow[] => {
    if (!parsed) return [];
    const out: ImportRow[] = [];
    for (const row of parsed.rows) {
      const cell = (idx: number) => (idx >= 0 ? row[idx] : null);
      const lastName = String(cell(mapping.last) ?? "").trim();
      const firstName = String(cell(mapping.first) ?? "").trim();
      if (!lastName || !firstName) continue;
      out.push({
        lastName,
        firstName,
        birthDate: toISODate(cell(mapping.birth)),
        phone: toPhone(cell(mapping.phone)),
        email: toEmail(cell(mapping.email)),
      });
    }
    return out;
  };

  const previewRows = parsed ? buildRows().slice(0, 10) : [];
  const totalRows = parsed ? buildRows().length : 0;

  const runImport = async () => {
    const rows = buildRows();
    if (!rows.length) {
      toast({ title: "Aucune donnée", description: "Vérifiez le mapping des colonnes (nom et prénom requis).", variant: "destructive" });
      return;
    }
    setImporting(true);
    startTimeRef.current = Date.now();
    setProgress({ done: 0, total: 0, phase: "Préparation de l'import…" });
    try {
      // 1. Dédupliquer au sein du fichier (fusion par nom + prénom)
      const fileMap = new Map<string, ImportRow>();
      let fileDupes = 0;
      for (const r of rows) {
        const k = rowKey(r.lastName, r.firstName);
        const ex = fileMap.get(k);
        if (ex) {
          fileDupes++;
          if (!ex.birthDate && r.birthDate) ex.birthDate = r.birthDate;
          if (!ex.phone && r.phone) ex.phone = r.phone;
          if (!ex.email && r.email) ex.email = r.email;
        } else {
          fileMap.set(k, { ...r });
        }
      }

      // 2. Charger TOUS les patients existants (pagination par blocs de 1 000 — limite PostgREST)
      const patients: {
        id: string;
        first_name: string;
        last_name: string;
        birth_date: string | null;
        phone: string | null;
        email: string | null;
        created_at: string;
      }[] = [];
      const dbChunkSize = 1000;
      setProgress({ done: 0, total: 0, phase: "Chargement des patients existants…" });
      for (let offset = 0; ; offset += dbChunkSize) {
        const { data: chunk, error } = await supabase
          .from("patients")
          .select("id, first_name, last_name, birth_date, phone, email, created_at")
          .order("created_at", { ascending: true })
          .range(offset, offset + dbChunkSize - 1);
        if (error) throw error;
        patients.push(...(chunk ?? []));
        setProgress({ done: 0, total: 0, phase: `Chargement des patients existants… (${patients.length})` });
        if (!chunk || chunk.length < dbChunkSize) break;
      }

      // 3. Fusionner les doublons déjà présents en base (même nom + prénom)
      const byKey = new Map<string, typeof patients>();
      for (const p of patients ?? []) {
        const k = rowKey(p.last_name, p.first_name);
        byKey.set(k, [...(byKey.get(k) ?? []), p]);
      }

      // Nombre total d'opérations : fusions de doublons en base + lignes du fichier à importer
      const totalDupes = [...byKey.values()].reduce((n, g) => n + g.length - 1, 0);
      const totalSteps = totalDupes + fileMap.size;
      let done = 0;
      const bump = (phase: string) => {
        done++;
        setProgress({ done, total: totalSteps, phase });
      };
      setProgress({ done: 0, total: totalSteps, phase: "Fusion des doublons en base…" });

      let dbMerged = 0;
      const keeperByKey = new Map<string, { id: string; birth_date: string | null; phone: string | null; email: string | null }>();
      for (const [k, group] of byKey) {
        const keeper = group[0];
        const merged = { id: keeper.id, birth_date: keeper.birth_date, phone: keeper.phone, email: keeper.email };
        for (const dup of group.slice(1)) {
          for (const table of ["appointments", "makeup_appointments", "vaccinations", "vaccine_reservations"] as const) {
            await supabase.from(table).update({ patient_id: keeper.id }).eq("patient_id", dup.id);
          }
          if (!merged.birth_date && dup.birth_date) merged.birth_date = dup.birth_date;
          if (!merged.phone && dup.phone) merged.phone = dup.phone;
          if (!merged.email && dup.email) merged.email = dup.email;
          await supabase.from("patients").delete().eq("id", dup.id);
          dbMerged++;
          bump("Fusion des doublons en base…");
        }
        if (group.length > 1) {
          await supabase.from("patients").update({
            birth_date: merged.birth_date,
            phone: merged.phone,
            email: merged.email,
          }).eq("id", keeper.id);
        }
        keeperByKey.set(k, merged);
      }

      // 4. Importer les lignes du fichier (mise à jour ou création)
      const importResults: ResultRow[] = [];
      setProgress({ done, total: totalSteps, phase: "Import des patients du fichier…" });
      for (const r of fileMap.values()) {
        try {
          const k = rowKey(r.lastName, r.firstName);
          const existing = keeperByKey.get(k);
          if (existing) {
            const patch: { birth_date?: string; phone?: string; email?: string } = {};
            if (!existing.birth_date && r.birthDate) patch.birth_date = r.birthDate;
            if (!existing.phone && r.phone) patch.phone = r.phone;
            if (!existing.email && r.email) patch.email = r.email;
            if (Object.keys(patch).length > 0) {
              const { error: upErr } = await supabase.from("patients").update(patch).eq("id", existing.id);
              if (upErr) {
                importResults.push({ ...r, status: "error", message: upErr.message });
                continue;
              }
              if (patch.birth_date) existing.birth_date = patch.birth_date;
              if (patch.phone) existing.phone = patch.phone;
              if (patch.email) existing.email = patch.email;
              importResults.push({ ...r, status: "updated" });
            } else {
              importResults.push({ ...r, status: "unchanged" });
            }
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from("patients")
              .insert({
                first_name: capitalizeName(r.firstName),
                last_name: capitalizeName(r.lastName),
                birth_date: r.birthDate,
                phone: r.phone,
                email: r.email,
              })
              .select("id")
              .single();
            if (insErr) {
              importResults.push({ ...r, status: "error", message: insErr.message });
              continue;
            }
            keeperByKey.set(k, { id: inserted.id, birth_date: r.birthDate, phone: r.phone, email: r.email });
            importResults.push({ ...r, status: "created" });
          }
        } finally {
          bump("Import des patients du fichier…");
        }
      }

      const newStats: ImportStats = {
        created: importResults.filter((r) => r.status === "created").length,
        updated: importResults.filter((r) => r.status === "updated").length,
        unchanged: importResults.filter((r) => r.status === "unchanged").length,
        errors: importResults.filter((r) => r.status === "error").length,
        fileDupes,
        dbMerged,
      };
      setResults(importResults);
      setStats(newStats);
      toast({
        title: "Import terminé",
        description: `${newStats.created} créé(s), ${newStats.updated} complété(s), ${dbMerged} doublon(s) fusionné(s).`,
      });
    } catch (e) {
      toast({
        title: "Erreur d'import",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const mappingSelect = (label: string, field: keyof Mapping, required = false) => (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={String(mapping[field])}
        onValueChange={(v) => setMapping((m) => ({ ...m, [field]: parseInt(v, 10) }))}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="-1">—</SelectItem>
          {parsed?.headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const statusBadge = (status: ResultRow["status"]) => {
    switch (status) {
      case "created":
        return <Badge>Créé</Badge>;
      case "updated":
        return <Badge variant="secondary">Complété</Badge>;
      case "unchanged":
        return <Badge variant="outline">Inchangé</Badge>;
      case "error":
        return <Badge variant="destructive">Erreur</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import de patients (IA)</CardTitle>
        <CardDescription>
          Importez un fichier .xls, .xlsx ou .csv. Les patients portant les mêmes nom et prénom sont automatiquement fusionnés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFile}
            className="max-w-sm"
          />
          {parsed && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <FileSpreadsheet className="h-4 w-4" />
              {parsed.fileName} — {totalRows} ligne(s) valide(s)
            </span>
          )}
        </div>

        {parsed && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-2">Correspondance des colonnes</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {mappingSelect("Nom", "last", true)}
                {mappingSelect("Prénom", "first", true)}
                {mappingSelect("Date de naissance", "birth")}
                {mappingSelect("Téléphone", "phone")}
                {mappingSelect("Email", "email")}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Aperçu (10 premières lignes)</h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Date de naissance</TableHead>
                      <TableHead>Téléphone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aucune ligne valide — vérifiez le mapping des colonnes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.lastName}</TableCell>
                          <TableCell>{r.firstName}</TableCell>
                          <TableCell>{formatDateDisplay(r.birthDate)}</TableCell>
                          <TableCell>{r.phone ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Button onClick={runImport} disabled={importing || previewRows.length === 0}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer {totalRows} patient(s)
                </>
              )}
            </Button>

            {importing && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{progress.phase}</span>
                  <span className="font-medium tabular-nums">
                    {progress.done} / {progress.total} patient(s)
                  </span>
                </div>
                <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
                <p className="text-xs text-muted-foreground">
                  Temps restant estimé : {formatETA(progress.done, progress.total, startTimeRef.current)}
                </p>
              </div>
            )}
          </>
        )}

        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge>{stats.created} créé(s)</Badge>
            <Badge variant="secondary">{stats.updated} complété(s)</Badge>
            <Badge variant="outline">{stats.unchanged} inchangé(s)</Badge>
            <Badge variant="outline">{stats.fileDupes} doublon(s) dans le fichier</Badge>
            <Badge variant="outline">{stats.dbMerged} doublon(s) fusionné(s) en base</Badge>
            {stats.errors > 0 && <Badge variant="destructive">{stats.errors} erreur(s)</Badge>}
          </div>
        )}

        {results && (
          <div>
            <h3 className="text-sm font-medium mb-2">Liste importée ({results.length} patients)</h3>
            <div className="border rounded-md overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Date de naissance</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{capitalizeName(r.lastName)}</TableCell>
                      <TableCell>{capitalizeName(r.firstName)}</TableCell>
                      <TableCell>{formatDateDisplay(r.birthDate)}</TableCell>
                      <TableCell>{r.phone ?? "—"}</TableCell>
                      <TableCell>
                        {statusBadge(r.status)}
                        {r.message && (
                          <span className="block text-xs text-destructive mt-1">{r.message}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
