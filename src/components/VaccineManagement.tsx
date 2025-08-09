import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle, Edit, Trash2, Printer, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface VaccineVial {
  id: string;
  arrivalDate: string;
  brand: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
}

export const VaccineManagement = () => {
  const { toast } = useToast();
  const [vials, setVials] = useState<VaccineVial[]>([
    {
      id: "1",
      arrivalDate: "2024-01-15",
      brand: "Comirnaty",
      lotNumber: "LOT001",
      expiryDate: "2024-12-31",
      quantity: 25
    },
    {
      id: "2",
      arrivalDate: "2024-02-10",
      brand: "Comirnaty",
      lotNumber: "LOT002",
      expiryDate: "2024-11-15",
      quantity: 15
    }
  ]);

  const [newVial, setNewVial] = useState({
    arrivalDate: "",
    brand: "Comirnaty",
    lotNumber: "",
    expiryDate: "",
    quantity: 0
  });

  const [editingVial, setEditingVial] = useState<VaccineVial | null>(null);
  const [arrivalDate, setArrivalDate] = useState<Date>();
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [editArrivalDate, setEditArrivalDate] = useState<Date>();
  const [editExpiryDate, setEditExpiryDate] = useState<Date>();

  const handleAddVial = () => {
    if (!arrivalDate || !newVial.lotNumber || !expiryDate) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const vial: VaccineVial = {
      id: Date.now().toString(),
      arrivalDate: format(arrivalDate, "yyyy-MM-dd"),
      brand: newVial.brand,
      lotNumber: newVial.lotNumber,
      expiryDate: format(expiryDate, "yyyy-MM-dd"),
      quantity: newVial.quantity
    };

    setVials([...vials, vial]);
    setNewVial({
      arrivalDate: "",
      brand: "Comirnaty",
      lotNumber: "",
      expiryDate: "",
      quantity: 0
    });
    setArrivalDate(undefined);
    setExpiryDate(undefined);

    toast({
      title: "Flacon ajouté",
      description: "Le flacon de vaccin a été ajouté avec succès"
    });
  };

  const handleEditVial = (vial: VaccineVial) => {
    setEditingVial(vial);
    setEditArrivalDate(new Date(vial.arrivalDate));
    setEditExpiryDate(new Date(vial.expiryDate));
  };

  const handleSaveEdit = () => {
    if (!editingVial || !editArrivalDate || !editExpiryDate) return;

    const updatedVials = vials.map(vial => 
      vial.id === editingVial.id 
        ? {
            ...editingVial,
            arrivalDate: format(editArrivalDate, "yyyy-MM-dd"),
            expiryDate: format(editExpiryDate, "yyyy-MM-dd")
          }
        : vial
    );

    setVials(updatedVials);
    setEditingVial(null);
    setEditArrivalDate(undefined);
    setEditExpiryDate(undefined);

    toast({
      title: "Modification enregistrée",
      description: "Les informations du flacon ont été mises à jour"
    });
  };

  const handleDeleteVial = (id: string) => {
    setVials(vials.filter(vial => vial.id !== id));
    toast({
      title: "Flacon supprimé",
      description: "Le flacon a été retiré de l'inventaire"
    });
  };

  const handlePrintList = () => {
    window.print();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { label: "Rupture", variant: "destructive" as const };
    if (quantity <= 10) return { label: "Stock bas", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Gestion des Flacons de Vaccins</h2>
          <p className="text-muted-foreground">Encoder et gérer l'arrivée des vaccins</p>
        </div>
        <Button onClick={handlePrintList} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimer la liste
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Encoder l'arrivée d'un flacon
          </CardTitle>
          <CardDescription>
            Enregistrer un nouveau flacon de vaccin à son arrivée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Date d'arrivée *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !arrivalDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {arrivalDate ? format(arrivalDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={arrivalDate}
                    onSelect={setArrivalDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="brand">Marque du vaccin *</Label>
              <Select 
                value={newVial.brand} 
                onValueChange={(value) => setNewVial({ ...newVial, brand: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la marque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comirnaty">Comirnaty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lotNumber">Numéro de lot *</Label>
              <Input
                id="lotNumber"
                value={newVial.lotNumber}
                onChange={(e) => setNewVial({ ...newVial, lotNumber: e.target.value })}
                placeholder="Ex: LOT001"
              />
            </div>

            <div>
              <Label>Date de péremption *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                value={newVial.quantity}
                onChange={(e) => setNewVial({ ...newVial, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleAddVial} className="gap-2">
              <Package className="h-4 w-4" />
              Ajouter le flacon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des flacons */}
      <Card>
        <CardHeader>
          <CardTitle>Inventaire des vaccins</CardTitle>
          <CardDescription>
            Liste des flacons de vaccins en stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date d'arrivée</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Numéro de lot</TableHead>
                <TableHead>Date de péremption</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vials.map((vial) => {
                const stockStatus = getStockStatus(vial.quantity);
                const expiringSoon = isExpiringSoon(vial.expiryDate);
                
                return (
                  <TableRow key={vial.id}>
                    <TableCell>{format(new Date(vial.arrivalDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{vial.brand}</TableCell>
                    <TableCell>{vial.lotNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(new Date(vial.expiryDate), "dd/MM/yyyy")}
                        {expiringSoon && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vial.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVial(vial)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le flacon</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer ce flacon de l'inventaire ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteVial(vial.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {vials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun flacon de vaccin enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal d'édition */}
      {editingVial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Modifier le flacon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date d'arrivée</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editArrivalDate ? format(editArrivalDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editArrivalDate}
                      onSelect={setEditArrivalDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="edit-brand">Marque</Label>
                <Select 
                  value={editingVial.brand} 
                  onValueChange={(value) => setEditingVial({ ...editingVial, brand: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comirnaty">Comirnaty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-lot">Numéro de lot</Label>
                <Input
                  id="edit-lot"
                  value={editingVial.lotNumber}
                  onChange={(e) => setEditingVial({ ...editingVial, lotNumber: e.target.value })}
                />
              </div>

              <div>
                <Label>Date de péremption</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editExpiryDate ? format(editExpiryDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editExpiryDate}
                      onSelect={setEditExpiryDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="edit-quantity">Quantité</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editingVial.quantity}
                  onChange={(e) => setEditingVial({ ...editingVial, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Enregistrer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingVial(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};