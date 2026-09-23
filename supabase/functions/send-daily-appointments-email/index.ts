import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GMAIL_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const RECIPIENT = "info@remili.be";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("INTERNAL_JOBS_SECRET");
  const isCron = secret && req.headers.get("x-internal-secret") === secret;

  if (!isCron) {
    // Autorise aussi un déclenchement manuel par l'administrateur connecté
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );
    const { data } = await supabaseAuth.auth.getUser();
    if (data?.user?.email !== RECIPIENT) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: appts, error } = await supabase
      .from("appointments")
      .select(
        "appointment_time, services, notes, patients(first_name, last_name, phone, birth_date)",
      )
      .eq("appointment_date", tomorrow)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });

    if (error) throw error;

    const rows = (appts ?? []).map((a) => {
      const p = (a.patients ?? {}) as Record<string, string | null>;
      const services = Array.isArray(a.services) ? a.services.join(", ") : String(a.services ?? "");
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #ddd">${String(a.appointment_time).slice(0, 5)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(`${p.last_name ?? ""} ${p.first_name ?? ""}`.trim())}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(p.birth_date ?? "")}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(p.phone ?? "")}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(services)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(a.notes ?? "")}</td>
      </tr>`;
    });

    const [y, m, d] = tomorrow.split("-");
    const dateFr = `${d}/${m}/${y}`;
    const subject = `Rendez-vous du ${dateFr} — ${rows.length} rendez-vous`;
    const html =
      rows.length === 0
        ? `<p>Aucun rendez-vous prévu le ${dateFr}.</p>`
        : `<p>${rows.length} rendez-vous prévus le ${dateFr} :</p>
           <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
             <thead><tr>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Heure</th>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Patient</th>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Naissance</th>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Téléphone</th>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Services</th>
               <th style="padding:6px 10px;border:1px solid #ddd;background:#f4f4f4">Notes</th>
             </tr></thead>
             <tbody>${rows.join("")}</tbody>
           </table>`;

    const message = [
      `To: ${RECIPIENT}`,
      `Subject: ${header(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\r\n");

    const raw = b64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const res = await fetch(`${GMAIL_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Connection-Api-Key": Deno.env.get("GOOGLE_MAIL_API_KEY") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: "Gmail request failed", status: res.status, details }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, date: tomorrow, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-daily-appointments-email error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
