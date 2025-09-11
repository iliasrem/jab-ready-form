import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Syringe, Plus, Edit, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Vaccine {
  id: string
  name: string
  description: string
  is_available: boolean
  created_at: string
}

export const VaccineList = () => {
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_available: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchVaccines()
  }, [])

  const fetchVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccines')
        .select('*')
        .order('name')

      if (error) throw error
      setVaccines(data || [])
    } catch (error) {
      console.error('Error fetching vaccines:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingVaccine) {
        // Update vaccine
        const { error } = await supabase
          .from('vaccines')
          .update(formData)
          .eq('id', editingVaccine.id)

        if (error) throw error

        toast({
          title: "Vaccin modifié",
          description: "Le vaccin a été modifié avec succès.",
        })
      } else {
        // Create new vaccine
        const { error } = await supabase
          .from('vaccines')
          .insert(formData)

        if (error) throw error

        toast({
          title: "Vaccin créé",
          description: "Le vaccin a été créé avec succès.",
        })
      }

      // Reset form and close dialog
      setFormData({ name: '', description: '', is_available: true })
      setEditingVaccine(null)
      setIsDialogOpen(false)
      fetchVaccines()
    } catch (error) {
      console.error('Error saving vaccine:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine)
    setFormData({
      name: vaccine.name,
      description: vaccine.description || '',
      is_available: vaccine.is_available
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (vaccineId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce vaccin ?')) return

    try {
      const { error } = await supabase
        .from('vaccines')
        .delete()
        .eq('id', vaccineId)

      if (error) throw error

      toast({
        title: "Vaccin supprimé",
        description: "Le vaccin a été supprimé avec succès.",
      })
      fetchVaccines()
    } catch (error) {
      console.error('Error deleting vaccine:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      })
    }
  }

  const handleAvailabilityToggle = async (vaccineId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('vaccines')
        .update({ is_available: isAvailable })
        .eq('id', vaccineId)

      if (error) throw error

      fetchVaccines()
    } catch (error) {
      console.error('Error updating availability:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      })
    }
  }

  const openNewVaccineDialog = () => {
    setEditingVaccine(null)
    setFormData({ name: '', description: '', is_available: true })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Gestion des Vaccins
              </CardTitle>
              <CardDescription>
                Gérez la liste des vaccins disponibles
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewVaccineDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un vaccin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingVaccine ? 'Modifier le vaccin' : 'Nouveau vaccin'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingVaccine 
                      ? 'Modifiez les informations du vaccin'
                      : 'Ajoutez un nouveau vaccin à la liste'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du vaccin *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description du vaccin..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                    />
                    <Label htmlFor="is_available">Vaccin disponible</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isLoading || !formData.name}>
                      {isLoading ? "Sauvegarde..." : (editingVaccine ? "Modifier" : "Créer")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccines.map((vaccine) => (
                <TableRow key={vaccine.id}>
                  <TableCell className="font-medium">{vaccine.name}</TableCell>
                  <TableCell>{vaccine.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={vaccine.is_available}
                      onCheckedChange={(checked) => handleAvailabilityToggle(vaccine.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vaccine)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vaccine.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}