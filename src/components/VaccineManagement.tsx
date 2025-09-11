import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Vaccine {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
}

export const VaccineManagement = () => {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [newVaccine, setNewVaccine] = useState({
    name: "",
    description: "",
    is_available: true
  });

  useEffect(() => {
    fetchVaccines();
  }, []);

  const fetchVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from("vaccines")
        .select("*")
        .order("name");

      if (error) throw error;
      setVaccines(data || []);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      toast.error("Erreur lors du chargement des vaccins");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVaccine = async () => {
    if (!newVaccine.name.trim()) {
      toast.error("Le nom du vaccin est obligatoire");
      return;
    }

    try {
      const { error } = await supabase
        .from("vaccines")
        .insert([newVaccine]);

      if (error) throw error;

      toast.success("Vaccin ajouté avec succès");
      setNewVaccine({ name: "", description: "", is_available: true });
      fetchVaccines();
    } catch (error) {
      console.error("Error creating vaccine:", error);
      toast.error("Erreur lors de l'ajout du vaccin");
    }
  };

  const handleUpdateVaccine = async (vaccine: Vaccine) => {
    try {
      const { error } = await supabase
        .from("vaccines")
        .update({
          name: vaccine.name,
          description: vaccine.description,
          is_available: vaccine.is_available
        })
        .eq("id", vaccine.id);

      if (error) throw error;

      toast.success("Vaccin mis à jour avec succès");
      setEditingVaccine(null);
      fetchVaccines();
    } catch (error) {
      console.error("Error updating vaccine:", error);
      toast.error("Erreur lors de la mise à jour du vaccin");
    }
  };

  const handleDeleteVaccine = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce vaccin ?")) return;

    try {
      const { error } = await supabase
        .from("vaccines")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Vaccin supprimé avec succès");
      fetchVaccines();
    } catch (error) {
      console.error("Error deleting vaccine:", error);
      toast.error("Erreur lors de la suppression du vaccin");
    }
  };

  if (isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un nouveau vaccin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du vaccin *</Label>
              <Input
                id="name"
                value={newVaccine.name}
                onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })}
                placeholder="Ex: COVID-19"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="available"
                checked={newVaccine.is_available}
                onCheckedChange={(checked) => setNewVaccine({ ...newVaccine, is_available: checked })}
              />
              <Label htmlFor="available">Disponible</Label>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newVaccine.description}
              onChange={(e) => setNewVaccine({ ...newVaccine, description: e.target.value })}
              placeholder="Description du vaccin..."
            />
          </div>
          <Button onClick={handleCreateVaccine}>
            Ajouter le vaccin
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des vaccins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vaccines.map((vaccine) => (
              <div key={vaccine.id} className="flex items-center justify-between p-4 border rounded-lg">
                {editingVaccine?.id === vaccine.id ? (
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        value={editingVaccine.name}
                        onChange={(e) => setEditingVaccine({ ...editingVaccine, name: e.target.value })}
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingVaccine.is_available}
                          onCheckedChange={(checked) => setEditingVaccine({ ...editingVaccine, is_available: checked })}
                        />
                        <Label>Disponible</Label>
                      </div>
                    </div>
                    <Textarea
                      value={editingVaccine.description || ""}
                      onChange={(e) => setEditingVaccine({ ...editingVaccine, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateVaccine(editingVaccine)}>Sauvegarder</Button>
                      <Button variant="outline" onClick={() => setEditingVaccine(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <h3 className="font-semibold">{vaccine.name}</h3>
                      {vaccine.description && (
                        <p className="text-sm text-muted-foreground">{vaccine.description}</p>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${vaccine.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vaccine.is_available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVaccine(vaccine)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteVaccine(vaccine.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};