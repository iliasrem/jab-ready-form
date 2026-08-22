import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Download, Search, ChevronLeft, ChevronRight, Loader2, Merge, Phone, PhoneOff } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForDb } from "@/lib/utils";

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: Date | null;
  nextAppointment: Date | null;
  notes: string;
  status: "Active" | "Inactive";
}

const PAGE_SIZES = [50, 100, 150, 200];

// Génère la liste des numéros de page à afficher (avec ellipses)
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const pages: (number | "ellipsis")[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push("ellipsis");
  pages.push(total - 1);
  return pages;
}

export function PatientList() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Debounce de la recherche (400 ms) + retour à la première page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('patients')
        .select('id, first_name, last_name, email, phone, birth_date, status, notes', { count: 'exact' });

      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%_]/g, '');
        if (s) {
          query = query.or(
            `last_name.ilike.%${s}%,first_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`
          );
        }
      }

      if (phoneFilter === 'with') {
        query = query.not('phone', 'is', null).neq('phone', '');
      } else if (phoneFilter === 'without') {
        query = query.or('phone.is.null,phone.eq.');
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Erreur lors du chargement des patients:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des patients.",
          variant: "destructive",
        });
        return;
      }

      setTotalCount(count ?? 0);

      // Prochains rendez-vous uniquement pour les patients de la page courante
      const patientIds = (data ?? []).map((p: any) => p.id);
      const nextAppointments = new Map<string, Date>();
      if (patientIds.length > 0) {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('patient_id, appointment_date')
          .in('patient_id', patientIds)
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date', { ascending: true });

        appointmentsData?.forEach(apt => {
          if (!nextAppointments.has(apt.patient_id)) {
            nextAppointments.set(apt.patient_id, new Date(apt.appointment_date));
          }
        });
      }

      const mapped: Patient[] = (data ?? []).map((p: any) => {
        const firstName = p.first_name ?? "";
        const lastName = p.last_name ?? "";
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        const capitalizedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();

        return {
          id: p.id,
          firstName: capitalizedFirstName,
          lastName: capitalizedLastName,
          email: p.email ?? "",
          phone: p.phone ?? "",
          birthDate: p.birth_date ? new Date(p.birth_date) : null,
          nextAppointment: nextAppointments.get(p.id) || null,
          notes: p.notes ?? "",
          status: (p.status === 'inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
        };
      });

      setPatients(mapped);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, phoneFilter, toast]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const startEditing = (patient: Patient) => {
    setEditingPatient({ ...patient });
  };

  const cancelEditing = () => {
    setEditingPatient(null);
  };

  const saveChanges = async () => {
    if (!editingPatient) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          first_name: editingPatient.firstName,
          last_name: editingPatient.lastName,
          email: editingPatient.email,
          phone: editingPatient.phone,
          birth_date: editingPatient.birthDate ? formatDateForDb(editingPatient.birthDate) : null,
          status: editingPatient.status.toLowerCase() as 'active' | 'inactive',
          notes: editingPatient.notes
        })
        .eq('id', editingPatient.id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le patient.",
          variant: "destructive",
        });
        return;
      }

      setPatients(prev =>
        prev.map(patient =>
          patient.id === editingPatient.id ? editingPatient : patient
        )
      );

      toast({
        title: "Patient mis à jour",
        description: `Les informations de ${editingPatient.firstName} ${editingPatient.lastName} ont été mises à jour avec succès.`,
      });

      setEditingPatient(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePatient = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${patient.firstName} ${patient.lastName} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le patient.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Patient supprimé",
        description: `${patient.firstName} ${patient.lastName} a été supprimé de la liste.`,
      });

      loadPatients();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    }
  };

  const updateEditedField = (field: keyof Patient, value: any) => {
    if (!editingPatient) return;
    setEditingPatient({ ...editingPatient, [field]: value });
  };

  const mergeDuplicates = async () => {
    if (!confirm(
      "Fusionner les patients en double ayant exactement le même nom, prénom et date de naissance ?\n\n" +
      "Les fiches sans date de naissance mais avec un nom et un prénom identiques seront aussi fusionnées. " +
      "Les rendez-vous, vaccinations et réservations seront rattachés au dossier le plus ancien.\n\n" +
      "Cette action est irréversible."
    )) {
      return;
    }

    setMerging(true);
    try {
      const { data, error } = await (supabase as any).rpc('merge_duplicate_patients');

      if (error) {
        console.error('Erreur lors de la fusion:', error);
        toast({
          title: "Erreur",
          description: "Impossible de fusionner les doublons.",
          variant: "destructive",
        });
        return;
      }

      const result = data as { duplicate_groups: number; patients_deleted: number } | null;
      if (result && result.patients_deleted > 0) {
        toast({
          title: "Fusion terminée",
          description: `${result.patients_deleted} fiche(s) en double supprimée(s) dans ${result.duplicate_groups} groupe(s) de doublons.`,
        });
      } else {
        toast({
          title: "Aucun doublon",
          description: "Aucun patient en double (même nom, prénom et date de naissance) n'a été trouvé.",
        });
      }

      setPage(0);
      loadPatients();
    } catch (error) {
      console.error('Erreur lors de la fusion:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la fusion.",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  const exportToExcel = async () => {
    // Récupération de tous les patients par lots de 1000 (limite Supabase)
    const allPatients: any[] = [];
    const chunkSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('patients')
        .select('first_name, last_name, email, phone, birth_date, status, notes')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(offset, offset + chunkSize - 1);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'exporter la liste des patients.",
          variant: "destructive",
        });
        return;
      }

      allPatients.push(...(data ?? []));
      hasMore = (data?.length ?? 0) === chunkSize;
      offset += chunkSize;
    }

    const exportData = allPatients.map(p => ({
      Nom: p.last_name,
      Prénom: p.first_name,
      Email: p.email ?? "",
      Téléphone: p.phone ?? "",
      "Date de naissance": p.birth_date ? format(new Date(p.birth_date), "dd/MM/yyyy") : "",
      Statut: p.status === 'inactive' ? 'Inactive' : 'Active',
      Notes: p.notes ?? ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "patients.xlsx");

    toast({
      title: "Export réussi",
      description: `${allPatients.length} patients exportés avec succès.`,
    });
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const renderPagination = () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page === 0 || loading}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
        </PaginationItem>

        {getPageNumbers(page, totalPages).map((p, idx) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  goToPage(p);
                }}
              >
                {p + 1}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="gap-1"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <CardTitle>Gestion des Patients</CardTitle>
            <CardDescription>
              Cliquez sur l'icône d'édition pour modifier les informations d'un patient.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalCount} patient{totalCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={mergeDuplicates}
              disabled={merging}
              className="flex items-center gap-2"
            >
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
              Fusionner les doublons
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Barre de recherche + sélecteur de taille de page */}
        <div className="flex items-center gap-3 pt-4 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, email ou téléphone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-sm whitespace-nowrap">
              Patients par page :
            </Label>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(parseInt(v, 10));
                setPage(0);
              }}
            >
              <SelectTrigger id="page-size" className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPhoneFilter(prev => {
                if (prev === 'all') return 'with';
                if (prev === 'with') return 'without';
                return 'all';
              });
              setPage(0);
            }}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {phoneFilter === 'all' && <Phone className="h-4 w-4" />}
            {phoneFilter === 'with' && <Phone className="h-4 w-4 text-green-600" />}
            {phoneFilter === 'without' && <PhoneOff className="h-4 w-4 text-destructive" />}
            {phoneFilter === 'all' && "Tous les patients"}
            {phoneFilter === 'with' && "Avec téléphone"}
            {phoneFilter === 'without' && "Sans téléphone"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pagination du haut */}
        {renderPagination()}

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Prénom</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Téléphone</th>
                <th className="text-left p-3 font-medium">Date de naissance</th>
                <th className="text-left p-3 font-medium">Prochain RDV</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Notes</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <span className="font-medium">{patient.lastName}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{patient.firstName}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{patient.email}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{patient.phone}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">
                        {patient.birthDate
                          ? format(patient.birthDate, "dd/MM/yyyy")
                          : "Non renseigné"
                        }
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">
                        {patient.nextAppointment
                          ? format(patient.nextAppointment, "dd/MM/yyyy")
                          : "Aucun prévu"
                        }
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant={patient.status === "Active" ? "default" : "outline"}>
                        {patient.status}
                      </Badge>
                    </td>
                    <td className="p-3 max-w-xs">
                      <span className="text-sm text-muted-foreground truncate block">
                        {patient.notes || "Aucune note"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(patient)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePatient(patient.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && patients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {debouncedSearch
              ? `Aucun patient trouvé pour « ${debouncedSearch} ».`
              : "Aucun patient trouvé. Les dossiers patients apparaîtront ici au fur et à mesure des réservations."}
          </div>
        )}

        {/* Pagination du bas */}
        {renderPagination()}

        <p className="text-center text-sm text-muted-foreground">
          Page {page + 1} sur {totalPages} — {patients.length} patient{patients.length > 1 ? 's' : ''} affiché{patients.length > 1 ? 's' : ''}
        </p>
      </CardContent>

      {/* Popup d'édition du patient */}
      <Dialog open={editingPatient !== null} onOpenChange={(open) => !open && cancelEditing()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le patient</DialogTitle>
            <DialogDescription>
              Modifiez les informations de {editingPatient?.firstName} {editingPatient?.lastName}, puis enregistrez.
            </DialogDescription>
          </DialogHeader>

          {editingPatient && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Nom</Label>
                  <Input
                    id="edit-lastName"
                    value={editingPatient.lastName}
                    onChange={(e) => updateEditedField("lastName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">Prénom</Label>
                  <Input
                    id="edit-firstName"
                    value={editingPatient.firstName}
                    onChange={(e) => updateEditedField("firstName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingPatient.email}
                  onChange={(e) => updateEditedField("email", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editingPatient.phone}
                    onChange={(e) => updateEditedField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-birthDate">Date de naissance</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    value={editingPatient.birthDate ? format(editingPatient.birthDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => updateEditedField("birthDate", e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select
                  value={editingPatient.status}
                  onValueChange={(v) => updateEditedField("status", v as "Active" | "Inactive")}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editingPatient.notes}
                  onChange={(e) => updateEditedField("notes", e.target.value)}
                  placeholder="Ajouter des notes…"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelEditing} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
