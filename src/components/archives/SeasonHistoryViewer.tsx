import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatTimeForDisplay } from "@/lib/utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COUNT_LABELS, useSeasonArchives } from "./useSeasonArchives";

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

export function SeasonHistoryViewer() {
  const { archives } = useSeasonArchives();
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [data, setData] = useState<ArchiveData>(EMPTY_DATA);
  const [patients, setPatients] = useState<Map<string, PatientInfo>>(new Map());
  const [vaccineNames, setVaccineNames] = useState<Map<string, string>>(new Map());
  const [loadingData, setLoadingData] = useState(false);

  // Sélectionne la saison la plus récente par défaut
  useEffect(() => {
    if (!selectedSeason && archives.length > 0) {
      setSelectedSeason(archives[0].season_label);
    }
  }, [archives, selectedSeason]);

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

  const selectedMeta = archives.find((a) => a.season_label === selectedSeason);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des saisons (lecture seule)</CardTitle>
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
