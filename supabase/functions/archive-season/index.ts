import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Une saison vaccinale court du 1er septembre au 31 août.
// "2025-2026" = [2025-09-01, 2026-09-01)
function seasonRange(season: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{4})$/.exec(season);
  if (!m) return null;
  const y1 = parseInt(m[1], 10);
  const y2 = parseInt(m[2], 10);
  if (y2 !== y1 + 1) return null;
  return { start: `${y1}-09-01`, end: `${y2}-09-01` };
}

type SupabaseClient = ReturnType<typeof createClient>;

// Tables archivées : source -> table d'archive + colonne de date de référence
const ARCHIVE_TARGETS: {
  source: string;
  archive: string;
  dateColumn: string;
  extraFilter?: (q: any) => any;
}[] = [
  { source: "appointments", archive: "appointments_archive", dateColumn: "appointment_date" },
  { source: "vaccinations", archive: "vaccinations_archive", dateColumn: "vaccination_date" },
  { source: "makeup_appointments", archive: "makeup_appointments_archive", dateColumn: "appointment_date" },
  { source: "vaccine_reservations", archive: "vaccine_reservations_archive", dateColumn: "reservation_date" },
  { source: "flu_vaccination_earnings", archive: "flu_vaccination_earnings_archive", dateColumn: "created_at" },
  // Seuls les lots clôturés sont archivés : un lot encore ouvert reste dans le stock courant
  {
    source: "vaccine_inventory",
    archive: "vaccine_inventory_archive",
    dateColumn: "reception_date",
    extraFilter: (q) => q.neq("status", "open"),
  },
];

const BATCH = 500;

async function archiveTable(
  supabase: SupabaseClient,
  target: (typeof ARCHIVE_TARGETS)[number],
  season: string,
  start: string,
  end: string,
): Promise<number> {
  let moved = 0;
  for (;;) {
    let query = supabase
      .from(target.source)
      .select("*")
      .gte(target.dateColumn, start)
      .lt(target.dateColumn, end)
      .limit(BATCH);
    if (target.extraFilter) query = target.extraFilter(query);

    const { data: rows, error } = await query;
    if (error) throw new Error(`${target.source}: ${error.message}`);
    if (!rows || rows.length === 0) break;

    const archiveRows = rows.map((r: Record<string, unknown>) => ({
      ...r,
      season_label: season,
    }));
    const { error: insErr } = await supabase.from(target.archive).insert(archiveRows);
    if (insErr) throw new Error(`${target.archive}: ${insErr.message}`);

    const ids = rows.map((r: { id: string }) => r.id);
    const { error: delErr } = await supabase.from(target.source).delete().in("id", ids);
    if (delErr) throw new Error(`${target.source} delete: ${delErr.message}`);

    moved += rows.length;
    if (rows.length < BATCH) break;
  }
  return moved;
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

  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  try {
    // 1. Vérifier que l'appelant est un admin authentifié
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: jsonHeaders });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès réservé à l'administrateur" }), { status: 403, headers: jsonHeaders });
    }

    // 2. Valider la saison demandée
    const json = await req.json().catch(() => null);
    const season = typeof json?.season === "string" ? json.season : "";
    const range = seasonRange(season);
    if (!range) {
      return new Response(JSON.stringify({ error: "Format de saison invalide (attendu : 2025-2026)" }), { status: 400, headers: jsonHeaders });
    }

    // 3. Refuser si déjà archivée
    const { data: existing } = await supabase
      .from("season_archives")
      .select("id")
      .eq("season_label", season)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: `La saison ${season} est déjà archivée` }), { status: 400, headers: jsonHeaders });
    }

    // 4. Déplacer les données de chaque table vers son archive
    const counts: Record<string, number> = {};
    for (const target of ARCHIVE_TARGETS) {
      counts[target.source] = await archiveTable(supabase, target, season, range.start, range.end);
    }

    // 5. Enregistrer les métadonnées de l'archive
    const { error: metaErr } = await supabase.from("season_archives").insert({
      season_label: season,
      start_date: range.start,
      end_date: range.end,
      counts,
    });
    if (metaErr) throw new Error(`season_archives: ${metaErr.message}`);

    return new Response(JSON.stringify({ success: true, season, counts }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("archive-season error", e);
    return new Response(JSON.stringify({ error: "Erreur serveur lors de l'archivage" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
