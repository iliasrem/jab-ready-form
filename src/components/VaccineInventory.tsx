import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Package } from "lucide-react";

interface VaccineInventoryItem {
  id: string;
  lot_number: string;
  expiry_date: string;
  reception_date: string;
  vials_count: number;
  vials_used: number;
  created_at: string;
}

export const VaccineInventory = () => {
  const [inventory, setInventory] = useState<VaccineInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    lot_number: "",
    expiry_date: "",
    reception_date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inventaire:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'inventaire",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Nouvelle boîte ajoutée à l'inventaire"
      });

      setFormData({
        lot_number: "",
        expiry_date: "",
        reception_date: new Date().toISOString().split('T')[0]
      });
      setIsDialogOpen(false);
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la boîte",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette boîte ?")) return;

    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Boîte supprimée de l'inventaire"
      });
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la boîte",
        variant: "destructive"
      });
    }
  };

  const updateVialsUsed = async (id: string, newCount: number) => {
    if (newCount < 0 || newCount > 10) {
      toast({
        title: "Erreur",
        description: "Le nombre de flacons utilisés doit être entre 0 et 10",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .update({ vials_used: newCount })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Nombre de flacons utilisés mis à jour"
      });
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le nombre de flacons",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Inventaire des Flacons de Vaccins</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une boîte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une nouvelle boîte de vaccins</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="lot_number">Numéro de lot</Label>
                    <Input
                      id="lot_number"
                      value={formData.lot_number}
                      onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                      placeholder="Ex: MR6603"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Date d'expiration</Label>
                    <Input
                      id="expiry_date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                      placeholder="Ex: 09/2025"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reception_date">Date de réception</Label>
                    <Input
                      id="reception_date"
                      type="date"
                      value={formData.reception_date}
                      onChange={(e) => setFormData({...formData, reception_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Ajouter</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune boîte dans l'inventaire
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de lot</TableHead>
                  <TableHead>Date d'expiration</TableHead>
                  <TableHead>Date de réception</TableHead>
                  <TableHead>Flacons restants</TableHead>
                  <TableHead>Flacons utilisés</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.lot_number}</TableCell>
                    <TableCell>{item.expiry_date}</TableCell>
                    <TableCell>{new Date(item.reception_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <span className={item.vials_count - item.vials_used === 0 ? "text-red-600 font-semibold" : ""}>
                        {item.vials_count - item.vials_used} / {item.vials_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={item.vials_used}
                        onChange={(e) => updateVialsUsed(item.id, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};