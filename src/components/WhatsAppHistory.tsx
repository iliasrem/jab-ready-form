import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageCircle, Loader2, MessageSquareText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ReminderRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  whatsapp_reminder_sent_at: string;
  patients: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
}

/** Date au format du modèle WhatsApp : "mardi 22 septembre 2026" */
const formatTemplateDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

/** Modèle v3 : site web, itinéraire Waze et téléphone à la fin du message. */
const MESSAGE_SUFFIX = `\n\n🌐 Site web : www.remili.be\n📍 Itinéraire : https://waze.com/ul?ll=50.4708576,4.2808433&navigate=yes\n📞 Téléphone : +3264442253`;

const buildMessage = (r: ReminderRow) => {
  const fullName = r.patients
    ? `${r.patients.first_name ?? ""} ${r.patients.last_name ?? ""}`.trim()
    : "";
  return `Bonjour ${fullName || "Madame, Monsieur"}, nous vous rappelons votre rendez-vous de vaccination à la Pharmacie Remili prévu demain ${formatTemplateDate(r.appointment_date)} à ${r.appointment_time.slice(0, 5)}. Merci de vous présenter quelques minutes à l'avance avec votre carte d'identité. Si vous ne pouvez pas venir, répondez à ce message pour annuler ou déplacer votre rendez-vous.${MESSAGE_SUFFIX}`;
};

export const WhatsAppHistory = () => {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ["whatsapp-history"],
    queryFn: async (): Promise<ReminderRow[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, whatsapp_reminder_sent_at, patients(first_name, last_name, phone)")
        .not("whatsapp_reminder_sent_at", "is", null)
        .order("whatsapp_reminder_sent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ReminderRow[];
    },
    staleTime: 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <div>
            <CardTitle>Historique WhatsApp</CardTitle>
            <CardDescription>Rappels WhatsApp envoyés aux patients</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !reminders?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun rappel WhatsApp envoyé pour le moment.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {reminders.length} message{reminders.length > 1 ? "s" : ""} envoyé{reminders.length > 1 ? "s" : ""}
            </p>
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rendez-vous</TableHead>
                    <TableHead>Envoyé le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Message</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.patients ? `${r.patients.last_name ?? ""} ${r.patients.first_name ?? ""}`.trim() : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.patients?.phone ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(r.appointment_date), "EEEE d MMMM yyyy", { locale: fr })} à {r.appointment_time.slice(0, 5)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(r.whatsapp_reminder_sent_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                          Envoyé
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label="Voir le message envoyé"
                              title="Voir le message envoyé"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                            >
                              <MessageSquareText className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80 p-3">
                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                              <MessageCircle className="h-3.5 w-3.5" />
                              Message envoyé
                            </div>
                            <div className="whitespace-pre-line rounded-2xl rounded-br-sm bg-green-100 px-3 py-2 text-sm leading-relaxed text-foreground dark:bg-green-950">
                              {buildMessage(r)}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
