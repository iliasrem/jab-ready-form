import { useEffect, useMemo, useState } from "react";
import { Archive, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { seasonCandidates, useSeasonArchives } from "./useSeasonArchives";

export function ArchiveSeasonTool() {
  const { toast } = useToast();
  const { archives, reload } = useSeasonArchives();
  const [seasonToArchive, setSeasonToArchive] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const candidates = useMemo(
    () => seasonCandidates(archives.map((a) => a.season_label)),
    [archives]
  );

  useEffect(() => {
    if (!seasonToArchive && candidates.length > 0) {
      // Par défaut : la saison qui vient de se terminer (avant la saison courante)
      setSeasonToArchive(candidates[candidates.length - 2] ?? candidates[candidates.length - 1]);
    }
  }, [candidates, seasonToArchive]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("archive-season", {
        body: { season: seasonToArchive },
      });
      if (error || result?.error) {
        throw new Error(result?.error || error?.message || "Erreur lors de l'archivage");
      }
      const total = Object.values(result.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      toast({
        title: `Saison ${result.season} archivée`,
        description: `${total} enregistrements déplacés dans les archives.`,
      });
      setConfirmOpen(false);
      await reload();
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible d'archiver la saison.",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archiver une saison
          </CardTitle>
          <CardDescription>
            Déplace l'historique d'une saison terminée (rendez-vous, vaccinations, rattrapages,
            réservations, lots clôturés, gains grippe) vers les archives. Les données restent
            consultables en lecture seule dans l'utilitaire « Historique ».
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toutes les saisons sont déjà archivées.</p>
          ) : (
            <>
              <Select value={seasonToArchive} onValueChange={setSeasonToArchive}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Saison" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setConfirmOpen(true)} disabled={!seasonToArchive || archiving}>
                {archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Archiver la saison {seasonToArchive}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver la saison {seasonToArchive} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les données de la saison {seasonToArchive} (du 1er septembre au 31 août)
              seront déplacées vers les archives : rendez-vous, vaccinations, rendez-vous de
              rattrapage, réservations de vaccins, lots clôturés et relevés de gains grippe.
              Elles disparaîtront des écrans courants mais resteront consultables en lecture
              seule. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving}>
              {archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer l'archivage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
