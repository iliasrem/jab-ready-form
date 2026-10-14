import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SMS_GATEWAY_URL = 'https://connector-gateway.lovable.dev/gatewayapi';
const ADMIN_EMAIL = 'info@remili.be';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Les liens non approuvés sont rejetés par GatewayAPI : on les retire du SMS.
function toSmsText(text: string): string {
  return text
    .replace(/(?:[ \t]*·[ \t]*)?(?:https?:\/\/\S+|www\.(?!remili\.be\b)\S+)/gi, '')
    .split('\n').map((l) => l.trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SIGNATURE = 'Pharmacie Remili Bastin www.remili.be';

// La signature est toujours ajoutée (une seule fois) à la suite du message, sur la même ligne.
const SIG_TAIL = /\s*(?:[—–-]?\s*)?(?:pharmacie\s+remili(?:\s*[-–\s]\s*bastin)?(?:\s+www\.remili\.be)?|www\.remili\.be)[.!]*\s*$/i;
function withSignature(text: string): string {
  const base = text.replace(SIG_TAIL, '').trim();
  return base ? `${base} ${SIGNATURE}` : SIGNATURE;
}

function toE164Digits(phone: string): string | null {
  const p = (phone || '').replace(/[^\d+]/g, '');
  if (!p) return null;
  let d = p.startsWith('+') ? p.slice(1) : p.startsWith('00') ? p.slice(2) : p.startsWith('0') ? '32' + p.slice(1) : p;
  d = d.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? d : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GATEWAYAPI_API_KEY = Deno.env.get('GATEWAYAPI_API_KEY');
    if (!LOVABLE_API_KEY || !GATEWAYAPI_API_KEY) return json({ error: "La connexion SMS n'est pas configurée" }, 500);

    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData } = await authClient.auth.getUser();
    if (userData?.user?.email?.toLowerCase() !== ADMIN_EMAIL) return json({ error: 'Non autorisé' }, 401);

    const body = await req.json().catch(() => null);
    const base = toSmsText(typeof body?.message === 'string' ? body.message : '');
    const message = withSignature(base);
    const patientIds: string[] = Array.isArray(body?.patient_ids)
      ? body.patient_ids.filter((x: unknown) => typeof x === 'string')
      : [];
    const testPhone = typeof body?.test_phone === 'string' ? body.test_phone.trim() : '';
    const isTest = testPhone.length > 0;
    const date = typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;

    if (!base || base.length > 1000 || patientIds.length > 500 || (!isTest && patientIds.length === 0)) {
      return json({ error: 'Message ou liste de patients invalide' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let recipients: { id: string | null; name: string | null; phone: string }[] = [];
    if (isTest) {
      recipients = [{ id: null, name: 'TEST Jean', phone: testPhone }];
    } else {
      const { data, error } = await admin.from('patients').select('id, first_name, last_name, phone').in('id', patientIds);
      if (error) throw error;
      recipients = (data ?? []).map((p: any) => ({
        id: p.id,
        name: [p.last_name, p.first_name].filter(Boolean).join(' ') || null,
        phone: p.phone ?? '',
      }));
    }

    // Heure du rendez-vous du jour choisi, par patient (pour le tag {heure}).
    const times = new Map<string, string>();
    if (date && patientIds.length) {
      const { data: appts } = await admin
        .from('appointments')
        .select('patient_id, appointment_time')
        .eq('appointment_date', date)
        .neq('status', 'cancelled')
        .in('patient_id', patientIds)
        .order('appointment_time');
      for (const a of appts ?? []) {
        if (a.patient_id && a.appointment_time && !times.has(a.patient_id)) {
          times.set(a.patient_id, String(a.appointment_time).slice(0, 5));
        }
      }
    }

    const results: { patient_id: string | null; ok: boolean; error?: string }[] = [];
    for (const r of recipients) {
      const heure = isTest ? '10:00' : (r.id ? times.get(r.id) ?? '' : '');
      const personal = message
        .replace(/\{prénom\}/gi, (r.name ?? '').split(' ').slice(1).join(' ') || '')
        .replace(/\{nom\}/gi, r.name ?? '')
        .replace(/\{heure\}/gi, heure)
        .replace(/[ \t]+à[ \t]*(?=[.,])/g, ''); // enlève "à " resté seul si l'heure est vide
      const row: Record<string, unknown> = {
        patient_id: r.id, patient_name: r.name, phone: r.phone, body: personal, is_test: isTest, status: 'sent',
      };
      const to = toE164Digits(r.phone);
      if (!to) {
        row.status = 'failed'; row.error = 'Numéro de téléphone invalide';
      } else {
        const res = await fetch(`${SMS_GATEWAY_URL}/mobile/single`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GATEWAYAPI_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sender: 'Pharmacie', recipient: Number(to), message: personal }),
        });
        const text = await res.text();
        if (!res.ok) {
          console.error(`SMS failed [${res.status}]: ${text}`);
          row.status = 'failed'; row.error = `[${res.status}] ${text}`.slice(0, 2000);
        } else {
          try {
            const p = JSON.parse(text);
            row.provider_message_id = p?.msg_id ? String(p.msg_id) : p?.ids?.[0] ? String(p.ids[0]) : null;
          } catch (_) { /* ignore */ }
        }
      }
      await admin.from('sms_messages').insert(row);
      results.push({ patient_id: r.id, ok: row.status === 'sent', error: row.error as string | undefined });
    }
    const sent = results.filter((r) => r.ok).length;
    return json({ total: results.length, sent, failed: results.length - sent, results });
  } catch (e) {
    console.error('send-sms error:', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
