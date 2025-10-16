import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Syringe, TrendingUp, Euro, Activity, Edit2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VaccinationStats {
  covidCount: number;
  grippeCount: number;
  totalEarnings: number;
}

interface FluEarnings {
  id?: string;
  vaccine_count: number;
  price_per_vaccine: number;
  total: number;
}

export const Statistics = () => {
  const [stats, setStats] = useState<VaccinationStats>({
    covidCount: 0,
    grippeCount: 0,
    totalEarnings: 0
  });
  const [fluEarnings, setFluEarnings] = useState<FluEarnings>({
    vaccine_count: 0,
    price_per_vaccine: 15.50,
    total: 0
  });
  const [isEditingFlu, setIsEditingFlu] = useState(false);
  const [tempFluCount, setTempFluCount] = useState("0");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const COVID_PRICE = 18.72;

  const fetchFluEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('flu_vaccination_earnings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération des gains grippe:', error);
        return;
      }

      if (data) {
        const pricePerVaccine = typeof data.price_per_vaccine === 'string' 
          ? parseFloat(data.price_per_vaccine) 
          : Number(data.price_per_vaccine);
        const total = data.vaccine_count * pricePerVaccine;
        setFluEarnings({
          id: data.id,
          vaccine_count: data.vaccine_count,
          price_per_vaccine: pricePerVaccine,
          total
        });
        setTempFluCount(data.vaccine_count.toString());
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des gains grippe:', error);
    }
  };

  const saveFluEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour sauvegarder",
          variant: "destructive"
        });
        return;
      }

      const count = parseInt(tempFluCount) || 0;
      const total = count * fluEarnings.price_per_vaccine;

      if (fluEarnings.id) {
        // Update existing
        const { error } = await supabase
          .from('flu_vaccination_earnings')
          .update({
            vaccine_count: count,
            updated_at: new Date().toISOString()
          })
          .eq('id', fluEarnings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('flu_vaccination_earnings')
          .insert({
            user_id: user.id,
            vaccine_count: count,
            price_per_vaccine: fluEarnings.price_per_vaccine
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setFluEarnings(prev => ({ ...prev, id: data.id }));
        }
      }

      setFluEarnings(prev => ({
        ...prev,
        vaccine_count: count,
        total
      }));
      setIsEditingFlu(false);

      toast({
        title: "Succès",
        description: "Les gains grippe ont été sauvegardés"
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les données",
        variant: "destructive"
      });
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les vaccinations avec les informations des patients et rendez-vous
      const { data: vaccinations, error } = await supabase
        .from('vaccinations')
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            email
          )
        `);

      if (error) {
        console.error('Erreur lors de la récupération des vaccinations:', error);
        return;
      }

      if (!vaccinations) {
        setStats({ covidCount: 0, grippeCount: 0, totalEarnings: 0 });
        return;
      }

      // Pour chaque vaccination, récupérer le rendez-vous correspondant pour connaître le type de vaccin
      let covidCount = 0;
      let grippeCount = 0;

      for (const vaccination of vaccinations) {
        // Récupérer le rendez-vous correspondant pour ce patient à cette date
        const { data: appointments } = await supabase
          .from('appointments')
          .select('services')
          .eq('patient_id', vaccination.patient_id)
          .eq('appointment_date', vaccination.vaccination_date)
          .limit(1);

        if (appointments && appointments.length > 0) {
          const services = appointments[0].services;
          
          // Vérifier le type de service dans le rendez-vous
          if (services && Array.isArray(services)) {
            if (services.includes('covid')) {
              covidCount++;
            } else if (services.includes('grippe')) {
              grippeCount++;
            }
          }
        } else {
          // Si aucun rendez-vous trouvé, on peut regarder le lot_number comme fallback
          const lotNumber = vaccination.lot_number?.toUpperCase() || '';
          if (
            lotNumber.includes('PF') ||
            lotNumber.includes('FF') ||
            lotNumber.includes('COVID') ||
            lotNumber.includes('COMIRNATY')
          ) {
            covidCount++;
          } else {
            grippeCount++;
          }
        }
      }

      // Calculer les gains uniquement sur les vaccins COVID
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
    fetchFluEarnings();
    
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'flu_vaccination_earnings'
      }, () => {
        fetchFluEarnings();
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

        {/* Gains COVID */}
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

        {/* Gains Grippe - Modifiable */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains Vaccins Grippe</CardTitle>
            <Euro className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {isEditingFlu ? (
                <>
                  <Input
                    type="number"
                    min="0"
                    value={tempFluCount}
                    onChange={(e) => setTempFluCount(e.target.value)}
                    className="w-24 h-8"
                  />
                  <span className="text-sm">vaccins</span>
                  <Button
                    size="sm"
                    onClick={saveFluEarnings}
                    className="ml-auto"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Sauver
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-600">
                    {fluEarnings.total.toFixed(2)}€
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingFlu(true)}
                    className="ml-auto"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fluEarnings.vaccine_count} vaccin(s) × {fluEarnings.price_per_vaccine.toFixed(2)}€
            </p>
            <Badge variant="secondary" className="mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              Modifiable
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
              <div className="text-sm text-muted-foreground">Gains COVID</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-600">{fluEarnings.total.toFixed(2)}€</div>
              <div className="text-sm text-muted-foreground">Gains Grippe</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {(stats.totalEarnings + fluEarnings.total).toFixed(2)}€
              </div>
              <div className="text-sm text-muted-foreground">Revenus Total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};