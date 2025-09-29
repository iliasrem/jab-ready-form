import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Syringe, TrendingUp, Euro, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VaccinationStats {
  covidCount: number;
  grippeCount: number;
  totalEarnings: number;
}

export const Statistics = () => {
  const [stats, setStats] = useState<VaccinationStats>({
    covidCount: 0,
    grippeCount: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  const COVID_PRICE = 18.72;

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les vaccinations
      const { data: vaccinations, error } = await supabase
        .from('vaccinations')
        .select('*');

      if (error) {
        console.error('Erreur lors de la récupération des vaccinations:', error);
        return;
      }

      if (!vaccinations) {
        setStats({ covidCount: 0, grippeCount: 0, totalEarnings: 0 });
        return;
      }

      // Analyser les lots pour déterminer le type de vaccin
      // Nous devons analyser le lot_number pour déterminer si c'est COVID ou grippe
      // Pour l'instant, nous allons supposer que si le lot contient "COVID", c'est COVID, sinon grippe
      let covidCount = 0;
      let grippeCount = 0;

      vaccinations.forEach((vaccination) => {
        const lotNumber = vaccination.lot_number?.toLowerCase() || '';
        
        // Logique pour identifier le type de vaccin basé sur le lot_number
        if (lotNumber.includes('covid') || lotNumber.includes('pfizer') || lotNumber.includes('moderna') || lotNumber.includes('bnt')) {
          covidCount++;
        } else {
          // Si ce n'est pas identifié comme COVID, on considère que c'est grippe
          grippeCount++;
        }
      });

      const totalEarnings = covidCount * COVID_PRICE;

      setStats({
        covidCount,
        grippeCount,
        totalEarnings
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    
    // Mettre à jour les statistiques en temps réel
    const channel = supabase
      .channel('vaccination-stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vaccinations'
      }, () => {
        fetchStatistics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Statistiques en Temps Réel</h3>
        <p className="text-sm text-muted-foreground">Données mises à jour automatiquement</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Vaccins COVID */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccins COVID</CardTitle>
            <Syringe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.covidCount}</div>
            <p className="text-xs text-muted-foreground">
              Total administrés
            </p>
            <Badge variant="secondary" className="mt-2">
              <Activity className="h-3 w-3 mr-1" />
              En temps réel
            </Badge>
          </CardContent>
        </Card>

        {/* Vaccins Grippe */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccins Grippe</CardTitle>
            <Syringe className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.grippeCount}</div>
            <p className="text-xs text-muted-foreground">
              Total administrés
            </p>
            <Badge variant="secondary" className="mt-2">
              <Activity className="h-3 w-3 mr-1" />
              En temps réel
            </Badge>
          </CardContent>
        </Card>

        {/* Gains */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains COVID</CardTitle>
            <Euro className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.totalEarnings.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {COVID_PRICE}€ par vaccin COVID
            </p>
            <Badge variant="secondary" className="mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              Calculé automatiquement
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Résumé global */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Résumé Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">{stats.covidCount + stats.grippeCount}</div>
              <div className="text-sm text-muted-foreground">Total vaccins</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{stats.covidCount}</div>
              <div className="text-sm text-muted-foreground">COVID</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{stats.grippeCount}</div>
              <div className="text-sm text-muted-foreground">Grippe</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-600">{stats.totalEarnings.toFixed(2)}€</div>
              <div className="text-sm text-muted-foreground">Revenus</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};