import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateForDb } from "@/lib/utils";
import { Trash2, Plus, Package, Edit2, Check, X } from "lucide-react";
import { format, parse } from "date-fns";

interface VaccineInventoryItem {
  id: string;
  lot_number: string;
  expiry_date: string;
  reception_date: string;
  vials_count: number;
  vials_used: number;
  doses_used: number;
  created_at: string;
}

export const VaccineInventory = () => {
  const [inventory, setInventory] = useState<VaccineInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    lot_number: "",
    expiry_date: "",
  });
  const [formData, setFormData] = useState({
    lot_number: "",
    expiry_date: "",
    reception_date: formatDateForDb(new Date())
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

  const formatExpiryDate = (dateStr: string) => {
    try {
      // Si c'est déjà au format DD/MM/YYYY, on le retourne tel quel
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return dateStr;
      }
      // Si c'est au format YYYY-MM-DD, on le convertit
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        return format(date, "dd/MM/yyyy");
      }
      // Sinon on retourne tel quel
      return dateStr;
    } catch {
      return dateStr;
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
        reception_date: formatDateForDb(new Date())
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

  const startEditing = (item: VaccineInventoryItem) => {
    setEditingRow(item.id);
    setEditFormData({
      lot_number: item.lot_number,
      expiry_date: formatExpiryDate(item.expiry_date),
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditFormData({ lot_number: "", expiry_date: "" });
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .update({
          lot_number: editFormData.lot_number,
          expiry_date: editFormData.expiry_date,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Informations mises à jour"
      });
      setEditingRow(null);
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations",
        variant: "destructive"
      });
    }
  };

  const updateDosesUsed = async (id: string, newCount: number) => {
    const maxDoses = 10 * 7; // 10 flacons × 7 doses = 70 doses max
    
    if (newCount < 0 || newCount > maxDoses) {
      toast({
        title: "Erreur",
        description: `Le nombre de doses utilisées doit être entre 0 et ${maxDoses}`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .update({ doses_used: newCount })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Nombre de doses utilisées mis à jour"
      });
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le nombre de doses",
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
                      placeholder="DD/MM/YYYY (ex: 22/12/2025)"
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
                  <TableHead>Doses restantes</TableHead>
                  <TableHead>Doses utilisées</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {editingRow === item.id ? (
                        <Input
                          value={editFormData.lot_number}
                          onChange={(e) => setEditFormData({...editFormData, lot_number: e.target.value})}
                          className="w-32"
                        />
                      ) : (
                        item.lot_number
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRow === item.id ? (
                        <Input
                          value={editFormData.expiry_date}
                          onChange={(e) => setEditFormData({...editFormData, expiry_date: e.target.value})}
                          placeholder="DD/MM/YYYY"
                          className="w-32"
                        />
                      ) : (
                        formatExpiryDate(item.expiry_date)
                      )}
                    </TableCell>
                    <TableCell>{new Date(item.reception_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <span className={(item.vials_count * 7) - item.doses_used === 0 ? "text-red-600 font-semibold" : ""}>
                        {(item.vials_count * 7) - item.doses_used} / {item.vials_count * 7} doses
                      </span>
                      <div className="text-xs text-muted-foreground">
                        ({Math.floor(((item.vials_count * 7) - item.doses_used) / 7)} flacons entiers restants)
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.vials_count * 7}
                        value={item.doses_used}
                        onChange={(e) => updateDosesUsed(item.id, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingRow === item.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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