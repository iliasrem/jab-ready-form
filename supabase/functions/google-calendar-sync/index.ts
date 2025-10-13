import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { action, appointmentData, code } = await req.json();

    // Handle OAuth callback
    if (action === 'oauth_callback' && code) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-sync`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('OAuth token error:', error);
        throw new Error('Failed to get OAuth token');
      }

      const tokens = await tokenResponse.json();
      
      // Calculate token expiry
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      // Store tokens in database
      const { error: dbError } = await supabaseClient
        .from('google_calendar_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Google Calendar connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle creating calendar event
    if (action === 'create_event' && appointmentData) {
      // Get user's Google Calendar token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Google Calendar not connected');
      }

      // Check if token needs refresh
      let accessToken = tokenData.access_token;
      if (new Date(tokenData.token_expiry) <= new Date()) {
        // Refresh token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            refresh_token: tokenData.refresh_token,
            client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;

        // Update stored token
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + newTokens.expires_in);

        await supabaseClient
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            token_expiry: expiryDate.toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Create event in Google Calendar
      const { appointmentDate, appointmentTime, services, patientName, patientEmail } = appointmentData;
      
      // Parse date and time
      const [hours, minutes] = appointmentTime.split(':');
      const startDateTime = new Date(appointmentDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + 30); // 30 min default duration

      const event: GoogleCalendarEvent = {
        summary: `Rendez-vous - ${patientName}`,
        description: `Services: ${services.join(', ')}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Europe/Brussels',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Europe/Brussels',
        },
      };

      if (patientEmail) {
        event.attendees = [{ email: patientEmail }];
      }

      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!calendarResponse.ok) {
        const error = await calendarResponse.text();
        console.error('Calendar API error:', error);
        throw new Error('Failed to create calendar event');
      }

      const createdEvent = await calendarResponse.json();

      return new Response(
        JSON.stringify({ 
          success: true, 
          eventId: createdEvent.id,
          eventLink: createdEvent.htmlLink 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle disconnecting Google Calendar
    if (action === 'disconnect') {
      const { error } = await supabaseClient
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Google Calendar disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
