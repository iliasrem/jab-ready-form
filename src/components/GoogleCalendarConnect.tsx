import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle2 } from 'lucide-react';

export const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter à Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Synchronisation Google Calendar
        </CardTitle>
        <CardDescription>
          Synchronisez automatiquement tous vos rendez-vous avec votre agenda Google
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>Connecté à Google Calendar</span>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? 'Connexion...' : 'Connecter Google Calendar'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
