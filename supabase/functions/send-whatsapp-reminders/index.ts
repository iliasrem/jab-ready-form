import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = [
  "https://rdv.lovable.app",
  "https://vaccination.remili.be",
  "https://id-preview--24a7b43c-f319-4774-b66d-a7256415de33.lovable.app",
  "https://24a7b43c-f319-4774-b66d-a7256415de33.lovableproject.com",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";
const TEMPLATE_NAME = "rappel_rdv_vaccination";
const TEMPLATE_LANG = "fr";
const TZ = "Europe/Brussels";

/** Date du jour (Bruxelles) + n jours, au format YYYY-MM-DD */
function dateInBrussels(offsetDays: number): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function formatFrenchDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Numéro E.164 sans "+" ; les numéros belges locaux sont préfixés 32. */
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "32" + digits.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const headers = { ...corsHeaders(req), "Content-Type": "application/json" };

  try {
    const cronSecret = Deno.env.get("WHATSAPP_REMINDER_CRON_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const whatsappKey = Deno.env.get("WHATSAPP_API_KEY");

    if (!lovableKey || !whatsappKey) {
      return new Response(
        JSON.stringify({ error: "Connexion WhatsApp non configurée" }),
        { status: 500, headers },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Autorisation : secret du planificateur OU administrateur connecté
    let authorized = false;
    if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
      authorized = true;
    } else {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: userRes } = await supabase.auth.getUser(token);
        const email = userRes?.user?.email?.toLowerCase();
        if (email === "info@remili.be") authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers,
      });
    }

    const targetDate = dateInBrussels(1);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, status, whatsapp_reminder_sent_at, patients:patient_id (first_name, last_name, phone)",
      )
      .eq("appointment_date", targetDate)
      .neq("status", "cancelled")
      .is("whatsapp_reminder_sent_at", null);

    if (error) {
      console.error("Erreur lecture rendez-vous:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }

    const results: Array<Record<string, unknown>> = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const appt of appointments ?? []) {
      const patient = (appt as any).patients;
      const phone = normalizePhone(patient?.phone ?? null);
      if (!phone) {
        skipped++;
        results.push({ appointment_id: appt.id, status: "skipped", reason: "numéro invalide ou absent" });
        continue;
      }

      const fullName = `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim();
      const timeLabel = String(appt.appointment_time).slice(0, 5);

      const response = await fetch(`${GATEWAY_URL}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": whatsappKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: fullName || "Madame, Monsieur" },
                  { type: "text", text: formatFrenchDate(appt.appointment_date) },
                  { type: "text", text: timeLabel },
                ],
              },
            ],
          },
        }),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        failed++;
        console.error(`Envoi WhatsApp échoué [${response.status}] pour ${appt.id}: ${bodyText}`);
        results.push({
          appointment_id: appt.id,
          status: "failed",
          http_status: response.status,
          details: bodyText,
        });
        continue;
      }

      await supabase
        .from("appointments")
        .update({ whatsapp_reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id);

      sent++;
      results.push({ appointment_id: appt.id, status: "sent", to: phone });
    }

    return new Response(
      JSON.stringify({ date: targetDate, total: appointments?.length ?? 0, sent, skipped, failed, results }),
      { status: 200, headers },
    );
  } catch (e) {
    console.error("Erreur send-whatsapp-reminders:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
});
