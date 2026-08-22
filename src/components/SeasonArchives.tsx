import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatTimeForDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SeasonArchiveMeta {
  id: string;
  season_label: string;
  start_date: string;
  end_date: string;
  counts: Record<string, number>;
  archived_at: string;
}

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
}

interface ArchiveData {
  appointments: any[];
  vaccinations: any[];
  makeupAppointments: any[];
  reservations: any[];
  inventory: any[];
  fluEarnings: any[];
}

const EMPTY_DATA: ArchiveData = {
  appointments: [],
  vaccinations: [],
  makeupAppointments: [],
  reservations: [],
  inventory: [],
  fluEarnings: [],
};

// Une saison court du 1er septembre au 31 août.
function currentSeasonLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function seasonCandidates(archived: string[]): string[] {
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

const COUNT_LABELS: Record<string, string> = {
  appointments: "rendez-vous",
  vaccinations: "vaccinations",
  makeup_appointments: "RDV rattrapage",
  vaccine_reservations: "réservations",
  vaccine_inventory: "lots",
  flu_vaccination_earnings: "relevés de gains",
};

export function SeasonArchives() {
  const { toast } = useToast();
  const [archives, setArchives] = useState<SeasonArchiveMeta[]>([]);
  const [seasonToArchive, setSeasonToArchive] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [data, setData] = useState<ArchiveData>(EMPTY_DATA);
  const [patients, setPatients] = useState<Map<string, PatientInfo>>(new Map());
  const [vaccineNames, setVaccineNames] = useState<Map<string, string>>(new Map());
  const [loadingData, setLoadingData] = useState(false);

  const loadArchives = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("season_archives")
      .select("*")
      .order("season_label", { ascending: false });
    if (error) {
      console.error("Erreur chargement archives:", error);
      return;
    }
    const list = (rows || []) as SeasonArchiveMeta[];
    setArchives(list);
    if (list.length > 0 && !list.some((a) => a.season_label === selectedSeason)) {
      setSelectedSeason((prev) => prev || list[0].season_label);
    }
  }, [selectedSeason]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const candidates = useMemo(
    () => seasonCandidates(archives.map((a) => a.season_label)),
    [archives]
  );

  useEffect(() => {
    if (!seasonToArchive && candidates.length > 0) {
      // Par défaut : la saison qui vient de se terminer (avant la saison courante)
      setSeasonToArchive(candidates[candidates.length - 2] ?? candidates[candidates.length - 1]);
    }
  }, [candidates, seasonToArchive]);

  const patientName = useCallback(
    (id: string | null) => {
      if (!id) return "—";
      const p = patients.get(id);
      return p ? `${p.last_name} ${p.first_name}` : "Patient supprimé";
    },
    [patients]
  );

  // Charger le contenu d'une saison archivée (lecture seule)
  useEffect(() => {
    if (!selectedSeason) {
      setData(EMPTY_DATA);
      return;
    }
    const load = async () => {
      setLoadingData(true);
      try {
        const [appt, vacc, makeup, res, inv, earn, pats, vaccs] = await Promise.all([
          supabase.from("appointments_archive").select("*").eq("season_label", selectedSeason).order("appointment_date").order("appointment_time"),
          supabase.from("vaccinations_archive").select("*").eq("season_label", selectedSeason).order("vaccination_date"),
          supabase.from("makeup_appointments_archive").select("*").eq("season_label", selectedSeason).order("appointment_date"),
          supabase.from("vaccine_reservations_archive").select("*").eq("season_label", selectedSeason).order("reservation_date"),
          supabase.from("vaccine_inventory_archive").select("*").eq("season_label", selectedSeason).order("reception_date"),
          supabase.from("flu_vaccination_earnings_archive").select("*").eq("season_label", selectedSeason).order("created_at"),
          supabase.from("patients").select("id, first_name, last_name"),
          supabase.from("vaccines").select("id, name"),
        ]);
        setData({
          appointments: appt.data || [],
          vaccinations: vacc.data || [],
          makeupAppointments: makeup.data || [],
          reservations: res.data || [],
          inventory: inv.data || [],
          fluEarnings: earn.data || [],
        });
        setPatients(new Map((pats.data || []).map((p: PatientInfo) => [p.id, p])));
        setVaccineNames(new Map((vaccs.data || []).map((v: { id: string; name: string }) => [v.id, v.name])));
      } catch (e) {
        console.error("Erreur chargement archive:", e);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [selectedSeason]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("archive-season", {
        body: { season: seasonToArchive },
      });
      if (error || result?.error) {
        throw new Error(result?.error || error?.message || "Erreur lors de l'archivage");
      }
      const total = Object.values(result.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      toast({
        title: `Saison ${result.season} archivée`,
        description: `${total} enregistrements déplacés dans les archives.`,
      });
      setConfirmOpen(false);
      await loadArchives();
      setSelectedSeason(result.season);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible d'archiver la saison.",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  const selectedMeta = archives.find((a) => a.season_label === selectedSeason);

  return (
    <div className="space-y-6">
      {/* Action d'archivage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archiver une saison
          </CardTitle>
          <CardDescription>
            Déplace l'historique d'une saison terminée (rendez-vous, vaccinations, rattrapages,
            réservations, lots clôturés, gains grippe) vers les archives. Les données restent
            consultables ci-dessous en lecture seule.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toutes les saisons sont déjà archivées.</p>
          ) : (
            <>
              <Select value={seasonToArchive} onValueChange={setSeasonToArchive}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Saison" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setConfirmOpen(true)} disabled={!seasonToArchive || archiving}>
                {archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Archiver la saison {seasonToArchive}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver la saison {seasonToArchive} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les données de la saison {seasonToArchive} (du 1er septembre au 31 août)
              seront déplacées vers les archives : rendez-vous, vaccinations, rendez-vous de
              rattrapage, réservations de vaccins, lots clôturés et relevés de gains grippe.
              Elles disparaîtront des écrans courants mais resteront consultables en lecture
              seule. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving}>
              {archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer l'archivage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consultation des archives */}
      <Card>
        <CardHeader>
          <CardTitle>Archives (lecture seule)</CardTitle>
          <CardDescription>Consultez l'historique des saisons archivées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {archives.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune saison archivée pour le moment.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Saison" />
                  </SelectTrigger>
                  <SelectContent>
                    {archives.map((a) => (
                      <SelectItem key={a.id} value={a.season_label}>{a.season_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMeta && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedMeta.counts || {}).map(([key, count]) => (
                      <Badge key={key} variant="secondary">
                        {count} {COUNT_LABELS[key] ?? key}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {loadingData ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'archive…
                </div>
              ) : (
                <div className="space-y-6">
                  <ArchiveSection title={`Rendez-vous (${data.appointments.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Heure</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Services</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.appointments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.appointment_date}</TableCell>
                            <TableCell>{formatTimeForDisplay(a.appointment_time)}</TableCell>
                            <TableCell>{patientName(a.patient_id)}</TableCell>
                            <TableCell>{(a.services || []).join(", ")}</TableCell>
                            <TableCell>{a.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>

                  <ArchiveSection title={`Vaccinations (${data.vaccinations.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Lot</TableHead>
                          <TableHead>Expiration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.vaccinations.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{v.vaccination_date}</TableCell>
                            <TableCell>{patientName(v.patient_id)}</TableCell>
                            <TableCell>{v.lot_number}</TableCell>
                            <TableCell>{v.expiry_date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>

                  <ArchiveSection title={`Rendez-vous de rattrapage (${data.makeupAppointments.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Heure</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.makeupAppointments.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.appointment_date}</TableCell>
                            <TableCell>{formatTimeForDisplay(m.appointment_time)}</TableCell>
                            <TableCell>{patientName(m.patient_id)}</TableCell>
                            <TableCell>{m.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>

                  <ArchiveSection title={`Réservations de vaccins (${data.reservations.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Vaccin</TableHead>
                          <TableHead>Appelé</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.reservations.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.reservation_date}</TableCell>
                            <TableCell>{patientName(r.patient_id)}</TableCell>
                            <TableCell>{vaccineNames.get(r.vaccine_id) ?? "—"}</TableCell>
                            <TableCell>{r.is_called ? "Oui" : "Non"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>

                  <ArchiveSection title={`Inventaire — lots (${data.inventory.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lot</TableHead>
                          <TableHead>Réception</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Flacons</TableHead>
                          <TableHead>Doses utilisées</TableHead>
                          <TableHead>Doses perdues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.inventory.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.lot_number}</TableCell>
                            <TableCell>{l.reception_date}</TableCell>
                            <TableCell>{l.expiry_date}</TableCell>
                            <TableCell>{l.vials_used}/{l.vials_count}</TableCell>
                            <TableCell>{l.doses_used}</TableCell>
                            <TableCell>{l.doses_lost}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>

                  <ArchiveSection title={`Gains vaccins grippe (${data.fluEarnings.length})`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Nombre de vaccins</TableHead>
                          <TableHead>Prix unitaire</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.fluEarnings.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{new Date(e.created_at).toLocaleDateString("fr-BE")}</TableCell>
                            <TableCell>{e.vaccine_count}</TableCell>
                            <TableCell>{Number(e.price_per_vaccine).toFixed(2)} €</TableCell>
                            <TableCell>{(e.vaccine_count * Number(e.price_per_vaccine)).toFixed(2)} €</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ArchiveSection>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ArchiveSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="rounded-md border overflow-x-auto">{children}</div>
    </div>
  );
}
