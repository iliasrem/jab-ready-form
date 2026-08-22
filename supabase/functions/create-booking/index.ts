import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const ALLOWED_ORIGINS = new Set([
  "https://rdv.lovable.app",
  "https://id-preview--24a7b43c-f319-4774-b66d-a7256415de33.lovable.app",
]);

function buildCors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://rdv.lovable.app";
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
  };
}

const BookingSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-zÀ-ÿ\s\-\.']+$/, "Prénom invalide"),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-zÀ-ÿ\s\-\.']+$/, "Nom invalide"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[+]?[0-9\s\-\(\)\.]+$/, "Téléphone invalide"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Heure invalide"),
  services: z.array(z.string().min(1).max(50)).min(1).max(2),
  notes: z.string().trim().max(500).optional().nullable(),
});

const normalizePhone = (p: string) => p.replace(/[\s\-\.\(\)]/g, "");

type SupabaseClient = ReturnType<typeof createClient>;

// Fusionne en arrière-plan les fiches patients en doublon
// (même email ou même téléphone normalisé) vers la fiche canonique.
async function mergeDuplicatePatients(
  supabase: SupabaseClient,
  canonicalId: string,
  emailNorm: string | null,
  phoneNorm: string,
) {
  try {
    // Filtre large côté base pour rattraper les variantes de formatage
    // du téléphone (espaces, tirets, +32...) : chiffres significatifs en ilike.
    const digits = phoneNorm.replace(/\D/g, "");
    const significant = digits.slice(-8);
    const phonePattern = "%" + significant.split("").join("%") + "%";

    const filters: string[] = [];
    if (emailNorm) filters.push(`email.eq.${emailNorm}`);
    if (significant.length >= 8) filters.push(`phone.ilike.${phonePattern}`);
    if (filters.length === 0) return;

    const { data: candidates, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, email, phone, birth_date, notes")
      .or(filters.join(","))
      .limit(50);
    if (error) {
      console.error("merge search err", error);
      return;
    }

    const duplicates = (candidates ?? []).filter((p) => {
      if (p.id === canonicalId) return false;
      const sameEmail =
        emailNorm && p.email && p.email.trim().toLowerCase() === emailNorm;
      const samePhone = p.phone && normalizePhone(p.phone) === phoneNorm;
      return sameEmail || samePhone;
    });

    if (duplicates.length === 0) return;
    const dupeIds = duplicates.map((p) => p.id);

    // Réassigner les données liées vers la fiche canonique
    for (const table of [
      "appointments",
      "makeup_appointments",
      "vaccinations",
      "vaccine_reservations",
    ]) {
      const { error: reassignErr } = await supabase
        .from(table)
        .update({ patient_id: canonicalId })
        .in("patient_id", dupeIds);
      if (reassignErr) console.error(`merge reassign ${table} err`, reassignErr);
    }

    // Enrichir la fiche canonique avec les infos manquantes
    const { data: canonical } = await supabase
      .from("patients")
      .select("email, phone, birth_date, notes")
      .eq("id", canonicalId)
      .single();

    const enrichment: Record<string, unknown> = {};
    if (canonical) {
      if (!canonical.email) {
        const src = duplicates.find((p) => p.email);
        if (src) enrichment.email = src.email!.trim().toLowerCase();
      }
      if (!canonical.phone) {
        const src = duplicates.find((p) => p.phone);
        if (src) enrichment.phone = src.phone;
      }
      if (!canonical.birth_date) {
        const src = duplicates.find((p) => p.birth_date);
        if (src) enrichment.birth_date = src.birth_date;
      }
    }
    const mergedNotes = duplicates
      .map((p) => p.notes)
      .filter(Boolean)
      .join(" | ");
    if (mergedNotes) {
      enrichment.notes = canonical?.notes
        ? `${canonical.notes} | ${mergedNotes}`
        : mergedNotes;
    }
    if (Object.keys(enrichment).length > 0) {
      const { error: enrichErr } = await supabase
        .from("patients")
        .update(enrichment)
        .eq("id", canonicalId);
      if (enrichErr) console.error("merge enrich err", enrichErr);
    }

    // Supprimer les doublons
    const { error: delErr } = await supabase
      .from("patients")
      .delete()
      .in("id", dupeIds);
    if (delErr) console.error("merge delete err", delErr);
    else console.log(`Merged ${dupeIds.length} duplicate patient(s) into ${canonicalId}`);
  } catch (e) {
    console.error("merge duplicates error", e);
  }
}

Deno.serve(async (req) => {
  const cors = buildCors(req);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = BookingSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const d = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Vérifier créneau non pris
    const { data: existing, error: checkErr } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", d.appointmentDate)
      .eq("appointment_time", d.appointmentTime)
      .eq("status", "pending");
    if (checkErr) {
      console.error("check err", checkErr);
      return new Response(JSON.stringify({ error: "Erreur de vérification" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "Créneau déjà réservé" }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Recherche patient existant (téléphone normalisé ou email) filtrée en base
    const normalizePhone = (p: string) => p.replace(/[\s\-\.\(\)]/g, "");
    const phoneNorm = normalizePhone(d.phone);
    const emailNorm = d.email ? d.email.trim().toLowerCase() : null;

    const filters = [`phone.eq.${phoneNorm}`];
    if (emailNorm) filters.push(`email.eq.${emailNorm}`);

    const { data: candidates, error: searchErr } = await supabase
      .from("patients")
      .select("id, first_name, last_name, email, phone")
      .or(filters.join(","))
      .limit(10);
    if (searchErr) console.error("search err", searchErr);

    const match = (candidates ?? []).find((p) => {
      if (emailNorm && p.email && p.email.trim().toLowerCase() === emailNorm) return true;
      if (p.phone && normalizePhone(p.phone) === phoneNorm) return true;
      return false;
    });

    let patientId: string;
    if (match) {
      patientId = match.id;
      const updates: Record<string, unknown> = {};
      if (match.first_name !== d.firstName) updates.first_name = d.firstName;
      if (match.last_name !== d.lastName) updates.last_name = d.lastName;
      if (emailNorm && (match.email ?? "").trim().toLowerCase() !== emailNorm) {
        updates.email = emailNorm;
      }
      if (normalizePhone(match.phone ?? "") !== phoneNorm) {
        updates.phone = d.phone;
      }
      if (Object.keys(updates).length > 0) {
        const { error: updErr } = await supabase
          .from("patients")
          .update(updates)
          .eq("id", patientId);
        if (updErr) console.error("patient update err", updErr);
      }
    } else {
      const { data: patient, error: patientErr } = await supabase
        .from("patients")
        .insert({
          first_name: d.firstName,
          last_name: d.lastName,
          email: emailNorm,
          phone: d.phone,
          notes: d.notes ?? null,
        })
        .select("id")
        .single();

      if (patientErr || !patient) {
        console.error("patient err", patientErr);
        return new Response(JSON.stringify({ error: "Impossible de créer le patient" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      patientId = patient.id;
    }

    // Créer rdv
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        appointment_date: d.appointmentDate,
        appointment_time: d.appointmentTime,
        services: d.services as unknown as string,
        notes: d.notes ?? null,
      })
      .select("id")
      .single();

    if (apptErr || !appt) {
      console.error("appt err", apptErr);
      return new Response(JSON.stringify({ error: "Impossible de créer le rendez-vous" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, appointment_id: appt.id, patient_id: patientId }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-booking error", e);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
