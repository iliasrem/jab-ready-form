import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Ban, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface BlockedDate {
  id: string;
  date: Date;
  activity: string;
}

export function BlockedDatesManager() {
  const { toast } = useToast();
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState<string>("");
  const [newActivity, setNewActivity] = useState<string>("");

  // Fonctions de gestion des jours bloqués
  const loadBlockedDatesFromSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: blockedData, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('user_id', user.id)
        .order('blocked_date', { ascending: true });

      if (error) throw error;

      if (blockedData) {
        const formattedData = blockedData.map(item => ({
          id: item.id,
          date: new Date(item.blocked_date + 'T00:00:00'),
          activity: item.activity
        }));
        setBlockedDates(formattedData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des jours bloqués:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les jours bloqués.",
        variant: "destructive"
      });
    }
  };

  const addBlockedDate = async () => {
    if (!newBlockedDate || !newActivity.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et indiquer l'activité.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_dates')
        .insert({
          user_id: user.id,
          blocked_date: newBlockedDate,
          activity: newActivity.trim()
        })
        .select()
        .single();

      if (error) throw error;

      const newBlocked = {
        id: data.id,
        date: new Date(data.blocked_date + 'T00:00:00'),
        activity: data.activity
      };

      setBlockedDates([...blockedDates, newBlocked]);
      setNewBlockedDate("");
      setNewActivity("");

      toast({
        title: "Jour bloqué ajouté",
        description: `Le ${format(newBlocked.date, "d MMMM yyyy", { locale: fr })} est bloqué pour: ${newBlocked.activity}`,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du jour bloqué:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le jour bloqué.",
        variant: "destructive"
      });
    }
  };

  const removeBlockedDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlockedDates(blockedDates.filter(blocked => blocked.id !== id));

      toast({
        title: "Jour débloqué",
        description: "Le jour a été retiré de la liste des jours bloqués.",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du jour bloqué:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jour bloqué.",
        variant: "destructive"
      });
    }
  };

  // Charger les jours bloqués au montage du composant
  useEffect(() => {
    loadBlockedDatesFromSupabase();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Gestion des jours bloqués
          </CardTitle>
          <CardDescription>
            Bloquez des journées entières pour d'autres activités (congés, formation, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          <div className="space-y-4 p-4 border border-muted rounded-lg bg-muted/30">
            <h4 className="font-medium">Ajouter un nouveau jour bloqué</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="blocked-date">Date</Label>
                <Input
                  id="blocked-date"
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  placeholder="Sélectionner une date"
                />
              </div>
              <div>
                <Label htmlFor="activity">Activité / Raison</Label>
                <Input
                  id="activity"
                  type="text"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="Ex: Congé, Formation, Réunion..."
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={addBlockedDate}
                  className="w-full"
                  disabled={!newBlockedDate || !newActivity.trim()}
                >
                  Bloquer ce jour
                </Button>
              </div>
            </div>
          </div>
          
          {/* Liste des jours bloqués */}
          {blockedDates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Jours actuellement bloqués</h4>
              <div className="grid gap-3">
                {blockedDates.map((blocked) => (
                  <div key={blocked.id} className="flex items-center justify-between p-3 border border-muted rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(blocked.date, "EEEE d MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {blocked.activity}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeBlockedDate(blocked.id)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Débloquer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {blockedDates.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              Aucun jour bloqué pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}