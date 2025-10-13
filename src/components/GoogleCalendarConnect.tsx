import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, Unlink } from "lucide-react";

export const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('id')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking connection:', error);
      }

      setIsConnected(!!data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = '963096895063-li3bdpmi693n6nrvn6fi3fq7ea00a1p2.apps.googleusercontent.com';
    const redirectUri = `https://xhflpqusuexinfwmibgv.supabase.co/functions/v1/google-calendar-sync`;
    const scope = 'https://www.googleapis.com/auth/calendar.events';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent',
    })}`;

    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: "Déconnecté",
        description: "Google Calendar a été déconnecté",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          {isConnected 
            ? "Vos rendez-vous sont synchronisés avec Google Calendar" 
            : "Connectez Google Calendar pour synchroniser automatiquement vos rendez-vous"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <Button 
            onClick={handleDisconnect} 
            variant="outline"
            className="w-full"
          >
            <Unlink className="h-4 w-4 mr-2" />
            Déconnecter Google Calendar
          </Button>
        ) : (
          <Button 
            onClick={handleConnect}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Connecter Google Calendar
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
