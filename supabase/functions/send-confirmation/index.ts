import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  to: string;
  name?: string;
  startISO: string;
  endISO: string;
  summary?: string;
  description?: string;
  location?: string;
}

function toICSDate(date: Date): string {
  // Returns UTC format YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function buildICS({ startISO, endISO, summary, description, location }: Payload): string {
  const uid = `${crypto.randomUUID()}@remili.be`;
  const dtstamp = toICSDate(new Date());
  const dtstart = toICSDate(new Date(startISO));
  const dtend = toICSDate(new Date(endISO));
  const s = (summary ?? "Rendez-vous Pharmacie Remili-Bastin").replace(/\n/g, " ");
  const desc = (description ?? "").replace(/\n/g, "\\n");
  const loc = (location ?? "Pharmacie Remili-Bastin").replace(/\n/g, " ");

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
    desc ? `DESCRIPTION:${desc}` : undefined,
    loc ? `LOCATION:${loc}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: Payload = await req.json();
    if (!body?.to || !body?.startISO || !body?.endISO) {
      return new Response(JSON.stringify({ error: "Missing required fields (to, startISO, endISO)" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ics = buildICS(body);
    const icsBase64 = btoa(ics);

    const resend = new Resend(RESEND_API_KEY);

    const subject = "Confirmation de votre rendez-vous pour la vaccination.";
    const from = "info@remili.be";

    const html = `
      <h2>Confirmation de votre rendez-vous</h2>
      <p>Bonjour ${body.name ?? ""},</p>
      <p>Merci pour votre demande de rendez-vous. Vous trouverez en pièce jointe un fichier à ajouter à votre calendrier.</p>
      <p>Résumé: ${subject}</p>
      <p>Lieu: ${body.location ?? "Pharmacie Remili-Bastin"}</p>
      <p>Cordialement,<br/>Pharmacie Remili-Bastin</p>
    `;

    const { error } = await resend.emails.send({
      from,
      to: [body.to],
      subject,
      html,
      attachments: [
        {
          filename: "rendez-vous.ics",
          content: icsBase64,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-confirmation error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
