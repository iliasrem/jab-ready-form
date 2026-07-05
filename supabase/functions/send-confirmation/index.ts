import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

const ALLOWED_ORIGINS = [
  "https://rdv.lovable.app",
  "https://id-preview--24a7b43c-f319-4774-b66d-a7256415de33.lovable.app",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

interface Payload {
  appointment_id: string;
}

function toICSDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildICS(opts: { startISO: string; endISO: string; summary: string; description: string; location: string }): string {
  const uid = `${crypto.randomUUID()}@remili.be`;
  const dtstamp = toICSDate(new Date());
  const dtstart = toICSDate(new Date(opts.startISO));
  const dtend = toICSDate(new Date(opts.endISO));
  const s = opts.summary.replace(/\n/g, " ");
  const desc = opts.description.replace(/\n/g, "\\n");
  const loc = opts.location.replace(/\n/g, " ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pharmacie Remili-Bastin//Appointment//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${s}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const body: Payload = await req.json().catch(() => ({} as Payload));
    const appointmentId = body?.appointment_id;

    if (!appointmentId || typeof appointmentId !== "string" || !UUID_RE.test(appointmentId)) {
      return new Response(JSON.stringify({ error: "Invalid appointment_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Récupérer le RDV + patient
    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .select("id, appointment_date, appointment_time, services, notes, confirmation_sent_at, patient_id, patients(first_name, last_name, email)")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr || !appt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (appt.confirmation_sent_at) {
      return new Response(JSON.stringify({ error: "Confirmation already sent" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const patient = (appt as any).patients;
    if (!patient?.email) {
      return new Response(JSON.stringify({ error: "Patient has no email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // Construire les dates de début/fin (15 min)
    const [hh, mm] = String(appt.appointment_time).split(":").map((n: string) => parseInt(n, 10));
    const start = new Date(`${appt.appointment_date}T00:00:00`);
    start.setHours(hh || 0, mm || 0, 0, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);

    const services: string[] = Array.isArray(appt.services) ? appt.services as string[] : [];
    const description = `Services: ${services.join(", ")}${appt.notes ? `\nNotes: ${appt.notes}` : ""}`;
    const location = "Pharmacie Remili-Bastin, Rue Solvay 64, 7160 Chapelle-lez-Herlaimont";
    const summary = "Rendez-vous Pharmacie Remili-Bastin";

    const ics = buildICS({
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      summary,
      description,
      location,
    });
    const icsBase64 = btoa(ics);

    const dateText = start.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
    const timeText = start.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
    const firstName = (patient.first_name || "").trim();

    const html = `
      <p>Bonjour ${firstName},</p>
      <p>Nous vous confirmons votre rendez-vous de vaccination à la Pharmacie Remili-Bastin :</p>
      <p>🗓 Date : <strong>${dateText}</strong><br/>
      🕒 Heure : <strong>${timeText}</strong><br/>
      📍 Adresse : <strong>Rue Solvay 64 à 7160 Chapelle-lez-Herlaimont</strong></p>
      <p>Merci de vous présenter quelques minutes à l'avance, muni(e) de votre carte d'identité.</p>
      <p>Si vous avez un empêchement ou si vous souhaitez modifier votre rendez-vous, n'hésitez pas à nous contacter au <strong>064 44 22 53</strong> ou par retour de mail.</p>
      <p>À très bientôt,<br/>Pharmacie Remili-Bastin<br/>Rue Solvay 64 à 7160 Chapelle-lez-Herlaimont</p>
    `;

    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "info@remili.be",
      to: [patient.email],
      subject: "Confirmation de votre rendez-vous pour la vaccination.",
      html,
      attachments: [
        { filename: "rendez-vous.ics", content: icsBase64, contentType: "text/calendar" },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // Marquer la confirmation comme envoyée
    await admin
      .from("appointments")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", appointmentId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e: any) {
    console.error("send-confirmation error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
});
