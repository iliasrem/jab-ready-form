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
import { Trash2, Plus, Package, Edit2, Check, X, Lock, LockOpen } from "lucide-react";
import { format, parse } from "date-fns";

interface VaccineInventoryItem {
  id: string;
  lot_number: string;
  expiry_date: string;
  reception_date: string;
  vials_count: number;
  status: string;
  created_at: string;
  doses_injected?: number;
}

export const VaccineInventory = () => {
  const [inventory, setInventory] = useState<VaccineInventoryItem[]>([]);
  const [emptyInventory, setEmptyInventory] = useState<VaccineInventoryItem[]>([]);
  const [closedInventory, setClosedInventory] = useState<VaccineInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    lot_number: "",
    expiry_date: "",
    reception_date: "",
    vials_count: 10,
  });
  const [formData, setFormData] = useState({
    lot_number: "",
    expiry_date: "",
    reception_date: formatDateForDb(new Date()),
    vials_count: 10,
  });
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      // Récupérer les données d'inventaire
      const { data: openData, error: openError } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('status', 'open')
        .order('reception_date', { ascending: false });

      if (openError) throw openError;

      const { data: emptyData, error: emptyError } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('status', 'empty')
        .order('reception_date', { ascending: false });

      if (emptyError) throw emptyError;

      const { data: closedData, error: closedError } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('status', 'closed')
        .order('reception_date', { ascending: false });

      if (closedError) throw closedError;

      // Récupérer le nombre de doses injectées par lot
      const { data: vaccinationsData, error: vaccinationsError } = await supabase
        .from('vaccinations')
        .select('lot_number');

      if (vaccinationsError) throw vaccinationsError;

      // Compter les doses par lot
      const dosesCount: Record<string, number> = {};
      vaccinationsData?.forEach(v => {
        dosesCount[v.lot_number] = (dosesCount[v.lot_number] || 0) + 1;
      });

      // Ajouter le comptage aux données
      const addDosesCount = (items: any[]) => 
        items.map(item => ({
          ...item,
          doses_injected: dosesCount[item.lot_number] || 0
        }));

      setInventory(addDosesCount(openData || []));
      setEmptyInventory(addDosesCount(emptyData || []));
      setClosedInventory(addDosesCount(closedData || []));
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
        .insert([{ ...formData, status: 'open' }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Nouvelle boîte ajoutée à l'inventaire"
      });

      setFormData({
        lot_number: "",
        expiry_date: "",
        reception_date: formatDateForDb(new Date()),
        vials_count: 10,
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
      reception_date: item.reception_date,
      vials_count: item.vials_count,
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditFormData({ 
      lot_number: "", 
      expiry_date: "",
      reception_date: "",
      vials_count: 10,
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .update({
          lot_number: editFormData.lot_number,
          expiry_date: editFormData.expiry_date,
          reception_date: editFormData.reception_date,
          vials_count: editFormData.vials_count,
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

  const changeBoxStatus = async (id: string, newStatus: 'open' | 'empty' | 'closed') => {
    try {
      const { error } = await supabase
        .from('vaccine_inventory')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      const statusLabels = {
        open: "Boîte ouverte",
        empty: "Boîte marquée comme vide",
        closed: "Boîte fermée"
      };

      toast({
        title: "Succès",
        description: statusLabels[newStatus]
      });
      fetchInventory();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut de la boîte",
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
              <CardTitle>Boîtes Ouvertes</CardTitle>
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
                  <div>
                    <Label htmlFor="vials_count">Nombre de flacons</Label>
                    <Input
                      id="vials_count"
                      type="number"
                      min="1"
                      value={formData.vials_count}
                      onChange={(e) => setFormData({...formData, vials_count: parseInt(e.target.value) || 1})}
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
              Aucune boîte ouverte dans l'inventaire
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Numéro de lot</TableHead>
                  <TableHead>Date d'expiration</TableHead>
                  <TableHead>Date de réception</TableHead>
                  <TableHead>Doses injectées</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                      {editingRow === item.id ? (
                        <Input
                          value={editFormData.lot_number}
                          onChange={(e) => setEditFormData({...editFormData, lot_number: e.target.value})}
                          className="w-32"
                        />
                      ) : (
                        item.lot_number
                      )}
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
                    <TableCell>
                      {editingRow === item.id ? (
                        <Input
                          type="date"
                          value={editFormData.reception_date}
                          onChange={(e) => setEditFormData({...editFormData, reception_date: e.target.value})}
                          className="w-36"
                        />
                      ) : (
                        new Date(item.reception_date).toLocaleDateString('fr-FR')
                      )}
                    </TableCell>
                    <TableCell>
                      {item.doses_injected || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.status === 'open' && (
                          <span className="flex items-center gap-1 text-green-600">
                            <LockOpen className="h-4 w-4" />
                            Ouverte
                          </span>
                        )}
                        {item.status === 'empty' && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Package className="h-4 w-4" />
                            Vide
                          </span>
                        )}
                        {item.status === 'closed' && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            Fermée
                          </span>
                        )}
                      </div>
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
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => changeBoxStatus(item.id, 'empty')}
                              title="Marquer comme vide"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => changeBoxStatus(item.id, 'closed')}
                              title="Fermer"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              title="Supprimer"
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Boîtes Fermées</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {closedInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune boîte fermée
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Numéro de lot</TableHead>
                  <TableHead>Date d'expiration</TableHead>
                  <TableHead>Date de réception</TableHead>
                  <TableHead>Doses injectées</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedInventory.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.lot_number}</TableCell>
                    <TableCell>{formatExpiryDate(item.expiry_date)}</TableCell>
                    <TableCell>{new Date(item.reception_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{item.doses_injected || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => changeBoxStatus(item.id, 'open')}
                          title="Ouvrir"
                        >
                          <LockOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Boîtes Vides</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {emptyInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune boîte vide
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Numéro de lot</TableHead>
                  <TableHead>Date d'expiration</TableHead>
                  <TableHead>Date de réception</TableHead>
                  <TableHead>Doses injectées</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emptyInventory.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.lot_number}</TableCell>
                    <TableCell>{formatExpiryDate(item.expiry_date)}</TableCell>
                    <TableCell>{new Date(item.reception_date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{item.doses_injected || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changeBoxStatus(item.id, 'open')}
                          title="Rouvrir"
                        >
                          <LockOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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