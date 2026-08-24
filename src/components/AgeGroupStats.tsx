import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Syringe } from "lucide-react";

interface AgeGroups {
  under50: number;
  between50and65: number;
  over65: number;
  unknown: number;
}

const computeAge = (birthDate: string, reference: Date): number => {
  const birth = new Date(birthDate);
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const AgeGroupStats = () => {
  const [groups, setGroups] = useState<AgeGroups | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      // Chargement paginé par blocs de 1 000 (limite PostgREST par défaut)
      const data: { birth_date: string | null }[] = [];
      const chunkSize = 1000;
      for (let offset = 0; ; offset += chunkSize) {
        const { data: chunk, error } = await supabase
          .from("patients")
          .select("birth_date")
          .eq("status", "active")
          .range(offset, offset + chunkSize - 1);
        if (error) {
          console.error("Erreur chargement patients:", error);
          setLoading(false);
          return;
        }
        data.push(...(chunk ?? []));
        if (!chunk || chunk.length < chunkSize) break;
      }

      const now = new Date();
      const result: AgeGroups = { under50: 0, between50and65: 0, over65: 0, unknown: 0 };

      (data || []).forEach((patient) => {
        if (!patient.birth_date) {
          result.unknown++;
          return;
        }
        const age = computeAge(patient.birth_date, now);
        if (age < 50) result.under50++;
        else if (age < 65) result.between50and65++;
        else result.over65++;
      });

      setGroups(result);
      setLoading(false);
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!groups) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Impossible de charger les données patients.
        </CardContent>
      </Card>
    );
  }

  const classicVaccines = groups.under50 + groups.between50and65;
  const concentratedVaccines = groups.over65;
  const totalKnown = classicVaccines + concentratedVaccines;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Répartition des patients par âge
          </CardTitle>
          <CardDescription>
            Nombre de patients actifs par tranche d'âge (patients sans date de naissance : {groups.unknown})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
              <div className="text-3xl font-bold">{groups.under50}</div>
              <div className="text-sm text-muted-foreground mt-1">Moins de 50 ans</div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
              <div className="text-3xl font-bold">{groups.between50and65}</div>
              <div className="text-sm text-muted-foreground mt-1">Entre 50 et 65 ans</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <div className="text-3xl font-bold">{groups.over65}</div>
              <div className="text-sm text-muted-foreground mt-1">65 ans et plus</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Estimation des vaccins à commander
          </CardTitle>
          <CardDescription>
            Basée sur {totalKnown} patients avec une date de naissance connue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-4 text-center">
              <div className="text-3xl font-bold">{classicVaccines}</div>
              <div className="text-sm text-muted-foreground mt-1">Vaccins classiques (moins de 65 ans)</div>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-4 text-center">
              <div className="text-3xl font-bold">{concentratedVaccines}</div>
              <div className="text-sm text-muted-foreground mt-1">Vaccins concentrés (65 ans et plus)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
