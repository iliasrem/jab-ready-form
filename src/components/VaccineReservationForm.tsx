import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Syringe } from 'lucide-react'

interface Vaccine {
  id: string
  name: string
  description: string
}

export const VaccineReservationForm = () => {
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    vaccineId: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchVaccines()
  }, [])

  const fetchVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccines')
        .select('*')
        .eq('is_available', true)
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
      // Create patient first
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone
        })
        .select()
        .single()

      if (patientError) throw patientError

      // Create vaccine reservation
      const { error: reservationError } = await supabase
        .from('vaccine_reservations')
        .insert({
          patient_id: patientData.id,
          vaccine_id: formData.vaccineId
        })

      if (reservationError) throw reservationError

      toast({
        title: "Réservation créée",
        description: "La réservation de vaccin a été créée avec succès.",
      })

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        vaccineId: ''
      })
    } catch (error) {
      console.error('Error creating reservation:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la réservation.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="h-5 w-5" />
          Réservation de Vaccin
        </CardTitle>
        <CardDescription>
          Remplissez ce formulaire pour réserver un vaccin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="vaccine">Vaccin *</Label>
            <Select value={formData.vaccineId} onValueChange={(value) => setFormData(prev => ({ ...prev, vaccineId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un vaccin" />
              </SelectTrigger>
              <SelectContent>
                {vaccines.map((vaccine) => (
                  <SelectItem key={vaccine.id} value={vaccine.id}>
                    {vaccine.name} - {vaccine.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading || !formData.firstName || !formData.lastName || !formData.vaccineId}>
            {isLoading ? "Création..." : "Créer la réservation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}