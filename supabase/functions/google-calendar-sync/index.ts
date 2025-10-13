import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentPayload {
  appointment_id: string;
  patient_name: string;
  patient_email?: string;
  appointment_date: string;
  appointment_time: string;
  services: string[];
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const payload: AppointmentPayload = await req.json();
    
    // Get user's Google Calendar token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const tokenExpiry = new Date(tokenData.token_expiry);
    const now = new Date();

    if (now >= tokenExpiry && tokenData.refresh_token) {
      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        const newExpiry = new Date(now.getTime() + (refreshData.expires_in * 1000));

        // Update token in database
        await supabaseClient
          .from('google_calendar_tokens')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry.toISOString(),
          })
          .eq('user_id', user.id);
      }
    }

    // Create Google Calendar event
    const startDateTime = `${payload.appointment_date}T${payload.appointment_time}:00`;
    const endTime = new Date(`${payload.appointment_date}T${payload.appointment_time}:00`);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30 min appointment
    const endDateTime = endTime.toISOString().slice(0, 19);

    const event = {
      summary: `Rendez-vous - ${payload.patient_name}`,
      description: `Services: ${payload.services.join(', ')}\n${payload.notes || ''}`,
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Brussels',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Brussels',
      },
      attendees: payload.patient_email ? [{ email: payload.patient_email }] : [],
    };

    const calendarId = tokenData.calendar_id || 'primary';
    const createEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!createEventResponse.ok) {
      const errorData = await createEventResponse.text();
      console.error('Google Calendar API error:', errorData);
      throw new Error('Failed to create Google Calendar event');
    }

    const createdEvent = await createEventResponse.json();

    // Update appointment with Google event ID
    await supabaseClient
      .from('appointments')
      .update({ google_event_id: createdEvent.id })
      .eq('id', payload.appointment_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        event_id: createdEvent.id,
        event_link: createdEvent.htmlLink 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
