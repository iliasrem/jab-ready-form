import { useEffect, useMemo, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Send, FlaskConical, CalendarDays, Search, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface P { id: string; first_name: string | null; last_name: string | null; phone: string | null; time?: string }

const TEST_PHONE_DEFAULT = "+32471806400";
const cap = (s: string | null) => (s ?? "").toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
const name = (p: P) => `${cap(p.last_name)} ${cap(p.first_name)}`.trim();
const smsText = (t: string) =>
  t.replace(/(?:[ \t]*·[ \t]*)?(?:https?:\/\/\S+|www\.(?!remili\.be\b)\S+)/gi, "").split("\n").map((l) => l.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();

const SIGNATURE = "Pharmacie Remili Bastin";

// La signature est toujours ajoutée (une seule fois) à la suite du message, sur la même ligne.
const SIG_TAIL = /\s*(?:[—–-]?\s*)?(?:pharmacie\s+remili(?:\s*[-–\s]\s*bastin)?(?:\s+www\.remili\.be)?|www\.remili\.be)[.!]*\s*$/i;
const signed = (t: string) => {
  const base = t.replace(SIG_TAIL, "").trim();
  return base ? `${base} ${SIGNATURE}` : SIGNATURE;
};

// Les accents (é, à, ê...) comptent double chez l'opérateur : on compte les unités GSM-7.
const GSM_EXT = new Set("à£$¥èéùìòÇØøÅåÄÖÑß¿ëîïÆæÉ".split(""));
const smsUnits = (t: string) => [...t].reduce((n, ch) => n + (GSM_EXT.has(ch) ? 2 : 1), 0);

const reminder = (date: string) =>
  `Bonjour {prénom}, rappel vaccination à la Pharmacie le ${format(parseISO(date), "d/MM/yyyy")} à {heure}. 064 44 22 53 ou WhatsApp +32 491 55 98 33. ${SIGNATURE}`;

async function errText(error: unknown) {
  return error instanceof FunctionsHttpError ? await error.context.text() : String((error as Error)?.message ?? error);
}

export const SmsCampaign = () => {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dayPatients, setDayPatients] = useState<P[]>([]);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<P[]>([]);
  const [selected, setSelected] = useState<Map<string, P>>(new Map());
  const [message, setMessage] = useState(() => reminder(format(new Date(), "yyyy-MM-dd")));
  const [testPhone, setTestPhone] = useState(TEST_PHONE_DEFAULT);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from("sms_messages" as any).select("*").order("created_at", { ascending: false }).limit(100);
    setHistory((data as any[]) ?? []);
  };
  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time, status, patients(id, first_name, last_name, phone)")
        .eq("appointment_date", date)
        .neq("status", "cancelled")
        .order("appointment_time");
      const list = ((data as any[]) ?? []).filter((a) => a.patients).map((a) => ({ ...a.patients, time: a.appointment_time?.slice(0, 5) }));
      setDayPatients(list);
    })();
  }, [date]);

  useEffect(() => {
    const words = search.trim().split(/\s+/).filter((w) => w.length >= 2);
    if (!words.length) { setFound([]); return; }
    const t = setTimeout(async () => {
      let q = supabase.from("patients").select("id, first_name, last_name, phone").not("phone", "is", null).limit(30);
      for (const w of words) {
        const s = w.replace(/[%,()]/g, "");
        q = q.or(`last_name.ilike.%${s}%,first_name.ilike.%${s}%,phone.ilike.%${s}%`);
      }
      const { data } = await q.order("last_name");
      setFound((data as P[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (p: P) => setSelected((prev) => {
    const n = new Map(prev);
    n.has(p.id) ? n.delete(p.id) : n.set(p.id, p);
    return n;
  });
  const selectAllDay = () => setSelected((prev) => {
    const n = new Map(prev);
    dayPatients.filter((p) => p.phone).forEach((p) => n.set(p.id, p));
    return n;
  });

  const bodyText = useMemo(
    () => smsText(message.replace(/\{prénom\}/gi, "Jean").replace(/\{nom\}/gi, "Dupont Jean").replace(/\{heure\}/gi, "10:00")),
    [message],
  );
  const finalText = useMemo(() => signed(bodyText), [bodyText]);
  const smsCount = Math.max(1, Math.ceil(smsUnits(finalText) / 160));

  const send = async (test: boolean) => {
    if (!bodyText) return;
    const ids = [...selected.keys()];
    if (!test && !ids.length) return;
    if (!confirm(test ? `Envoyer un SMS de test au ${testPhone} ?` : `Envoyer ce SMS à ${ids.length} patient(s) ?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: test ? { message, test_phone: testPhone, date } : { message, patient_ids: ids, date },
      });
      if (error) throw new Error(await errText(error));
      toast({ title: `${data.sent} SMS envoyé(s)`, description: data.failed ? `${data.failed} échec(s)` : undefined, variant: data.failed ? "destructive" : undefined });
      if (!test) setSelected(new Map());
      loadHistory();
    } catch (e) {
      toast({ title: "Échec de l'envoi", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const Row = ({ p }: { p: P }) => (
    <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p)} disabled={!p.phone} />
      {p.time && <span className="w-12 text-xs text-muted-foreground">{p.time}</span>}
      <span className="flex-1 text-sm">{name(p)}</span>
      <span className="text-xs text-muted-foreground">{p.phone || "pas de n°"}</span>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Destinataires</CardTitle>
          <CardDescription>Patients d'un jour de rendez-vous ou recherche libre</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); if (e.target.value) setMessage(reminder(e.target.value)); }} className="w-44" />
              <Button variant="outline" size="sm" onClick={selectAllDay} disabled={!dayPatients.length}>Tout cocher ({dayPatients.length})</Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border p-1">
              {dayPatients.length ? dayPatients.map((p) => <Row key={p.id + p.time} p={p} />) : <p className="p-3 text-sm text-muted-foreground">Aucun rendez-vous ce jour.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un patient (ex. : vanu vero)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            {found.length > 0 && <div className="max-h-56 overflow-y-auto rounded-md border p-1">{found.map((p) => <Row key={p.id} p={p} />)}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Message SMS</CardTitle>
            <CardDescription>Environ 1 SMS par tranche de 160 caractères</CardDescription>
          </div>
          <Badge variant="secondary">{selected.size} sélectionné(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <p className="text-xs text-muted-foreground">
            {smsUnits(finalText)} caractères · {smsCount} SMS par patient. Les liens internet sont retirés automatiquement.
            Écrivez {"{prénom}"} et {"{heure}"} dans le message : ils seront remplacés par le prénom du patient et l'heure de son rendez-vous.
            La signature « {SIGNATURE} » est ajoutée automatiquement à la suite du message.
          </p>
          <Button className="w-full" disabled={sending || !selected.size || !bodyText} onClick={() => send(false)}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer à {selected.size} patient(s)
          </Button>
          <div className="flex items-end gap-2 border-t pt-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="test-phone">Numéro de test</Label>
              <Input id="test-phone" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            </div>
            <Button variant="outline" disabled={sending || !testPhone || !bodyText} onClick={() => send(true)}>
              <FlaskConical className="mr-2 h-4 w-4" />Tester
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Historique SMS</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Téléphone</TableHead><TableHead>Message</TableHead><TableHead>Statut</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucun SMS envoyé</TableCell></TableRow>}
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{h.is_test ? "TEST" : h.patient_name}</TableCell>
                  <TableCell className="text-xs">{h.phone}</TableCell>
                  <TableCell className="max-w-md truncate text-xs" title={h.body}>{h.body}</TableCell>
                  <TableCell>
                    <Badge variant={h.status === "sent" ? "secondary" : "destructive"} title={h.error ?? undefined}>{h.status === "sent" ? "Envoyé" : "Échec"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
