import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const CALENDAR_ID =
  "423bc386dacd9759881883e4e57783d4661000babb649391a6803d557c6e3053@group.calendar.google.com";

function gatewayHeaders() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!lovableKey || !connKey) throw new Error("Google Calendar connection is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

async function deleteEvent(eventId: string) {
  const res = await fetch(
    `${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: gatewayHeaders() },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error(`Calendar delete failed [${res.status}]: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("INTERNAL_JOBS_SECRET");
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const appointmentId: string | undefined = payload.appointment_id;
    const action: string = payload.action ?? "upsert";
    const eventIdHint: string | undefined = payload.google_event_id;

    if (action === "delete") {
      if (eventIdHint) await deleteEvent(eventIdHint);
      return new Response(JSON.stringify({ success: true, deleted: Boolean(eventIdHint) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "appointment_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: appt, error } = await supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, services, status, notes, google_event_id, patients(first_name, last_name, phone, email, birth_date)",
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appt) {
      if (eventIdHint) await deleteEvent(eventIdHint);
      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rendez-vous annulé : on retire l'évènement de l'agenda
    if (appt.status === "cancelled") {
      const existing = appt.google_event_id ?? eventIdHint;
      if (existing) {
        await deleteEvent(existing);
        await supabase.from("appointments").update({ google_event_id: null }).eq("id", appt.id);
      }
      return new Response(JSON.stringify({ success: true, cancelled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patient = (appt.patients ?? {}) as Record<string, string | null>;
    const name = `${patient.last_name ?? ""} ${patient.first_name ?? ""}`.trim() || "Patient";
    const time = String(appt.appointment_time).slice(0, 5);
    const start = `${appt.appointment_date}T${time}:00`;
    const [h, m] = time.split(":").map(Number);
    const endMinutes = h * 60 + m + 15;
    const end = `${appt.appointment_date}T${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`;
    const services = Array.isArray(appt.services) ? appt.services.join(", ") : String(appt.services ?? "");

    const event = {
      summary: `Vaccination – ${name}`,
      description: [
        services ? `Services : ${services}` : null,
        patient.phone ? `Téléphone : ${patient.phone}` : null,
        patient.email ? `Email : ${patient.email}` : null,
        patient.birth_date ? `Né(e) le : ${patient.birth_date}` : null,
        appt.notes ? `Notes : ${appt.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: start, timeZone: "Europe/Brussels" },
      end: { dateTime: end, timeZone: "Europe/Brussels" },
    };

    const existingId = appt.google_event_id;
    const url = existingId
      ? `${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(existingId)}`
      : `${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

    let res = await fetch(url, {
      method: existingId ? "PATCH" : "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify(event),
    });

    // L'évènement a disparu côté Google : on en recrée un
    if (existingId && (res.status === 404 || res.status === 410)) {
      res = await fetch(`${GATEWAY_URL}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
        method: "POST",
        headers: gatewayHeaders(),
        body: JSON.stringify(event),
      });
    }

    if (!res.ok) {
      const details = await res.text();
      console.error(`Calendar sync failed [${res.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: "Google Calendar request failed", status: res.status, details }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const created = await res.json();
    if (created.id && created.id !== existingId) {
      await supabase.from("appointments").update({ google_event_id: created.id }).eq("id", appt.id);
    }

    return new Response(JSON.stringify({ success: true, event_id: created.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-calendar-sync error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
