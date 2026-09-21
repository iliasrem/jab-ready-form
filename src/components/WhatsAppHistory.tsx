import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2 } from "lucide-react";
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
