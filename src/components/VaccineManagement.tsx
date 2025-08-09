import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VaccineVial {
  id: string;
  name: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  minStock: number;
  manufacturer: string;
}

export const VaccineManagement = () => {
  const { toast } = useToast();
  const [vials, setVials] = useState<VaccineVial[]>([
    {
      id: "1",
      name: "Vaccin COVID-19",
      lotNumber: "LOT001",
      expiryDate: "2024-12-31",
      quantity: 25,
      minStock: 10,
      manufacturer: "Pfizer"
    },
    {
      id: "2",
      name: "Vaccin Grippe",
      lotNumber: "LOT002",
      expiryDate: "2024-11-15",
      quantity: 5,
      minStock: 15,
      manufacturer: "Sanofi"
    }
  ]);

  const [newVial, setNewVial] = useState({
    name: "",
    lotNumber: "",
    expiryDate: "",
    quantity: 0,
    minStock: 0,
    manufacturer: ""
  });

  const handleAddVial = () => {
    if (!newVial.name || !newVial.lotNumber) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const vial: VaccineVial = {
      id: Date.now().toString(),
      ...newVial
    };

    setVials([...vials, vial]);
    setNewVial({
      name: "",
      lotNumber: "",
      expiryDate: "",
      quantity: 0,
      minStock: 0,
      manufacturer: ""
    });

    toast({
      title: "Flacon ajouté",
      description: "Le flacon de vaccin a été ajouté avec succès"
    });
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity <= 0) return { label: "Rupture", variant: "destructive" as const };
    if (quantity <= minStock) return { label: "Stock bas", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Gestion des Flacons de Vaccins</h2>
        <p className="text-muted-foreground">Gérer le stock et les informations des vaccins</p>
      </div>

      {/* Ajouter un nouveau flacon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un Flacon
          </CardTitle>
          <CardDescription>
            Enregistrer un nouveau flacon de vaccin dans le stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Nom du Vaccin *</Label>
              <Input
                id="name"
                value={newVial.name}
                onChange={(e) => setNewVial({ ...newVial, name: e.target.value })}
                placeholder="Ex: Vaccin COVID-19"
              />
            </div>
            <div>
              <Label htmlFor="lotNumber">Numéro de Lot *</Label>
              <Input
                id="lotNumber"
                value={newVial.lotNumber}
                onChange={(e) => setNewVial({ ...newVial, lotNumber: e.target.value })}
                placeholder="Ex: LOT001"
              />
            </div>
            <div>
              <Label htmlFor="manufacturer">Fabricant</Label>
              <Input
                id="manufacturer"
                value={newVial.manufacturer}
                onChange={(e) => setNewVial({ ...newVial, manufacturer: e.target.value })}
                placeholder="Ex: Pfizer"
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Date d'Expiration</Label>
              <Input
                id="expiryDate"
                type="date"
                value={newVial.expiryDate}
                onChange={(e) => setNewVial({ ...newVial, expiryDate: e.target.value })}
              />
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
            <div>
              <Label htmlFor="minStock">Stock Minimum</Label>
              <Input
                id="minStock"
                type="number"
                value={newVial.minStock}
                onChange={(e) => setNewVial({ ...newVial, minStock: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleAddVial} className="gap-2">
              <Package className="h-4 w-4" />
              Ajouter le Flacon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des flacons */}
      <Card>
        <CardHeader>
          <CardTitle>Stock de Vaccins</CardTitle>
          <CardDescription>
            Vue d'ensemble des flacons de vaccins disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccin</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Fabricant</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vials.map((vial) => {
                const stockStatus = getStockStatus(vial.quantity, vial.minStock);
                const expiringSoon = isExpiringSoon(vial.expiryDate);
                
                return (
                  <TableRow key={vial.id}>
                    <TableCell className="font-medium">{vial.name}</TableCell>
                    <TableCell>{vial.lotNumber}</TableCell>
                    <TableCell>{vial.manufacturer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vial.expiryDate}
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
                  </TableRow>
                );
              })}
              {vials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucun flacon de vaccin enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};