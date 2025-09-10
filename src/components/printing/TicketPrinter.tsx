import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Printer, CheckCircle } from 'lucide-react'

interface TicketData {
  firstName: string
  lastName: string
  date: string
  time: string
  service?: string
}

interface TicketPrinterProps {
  ticketData: TicketData
  onPrintSuccess?: () => void
}

export const TicketPrinter = ({ ticketData, onPrintSuccess }: TicketPrinterProps) => {
  const [isPrinting, setIsPrinting] = useState(false)
  const [printerConnected, setPrinterConnected] = useState(false)
  const { toast } = useToast()

  // Commandes ESC/POS pour imprimantes Epson
  const ESC_POS = {
    INIT: [0x1B, 0x40], // Initialiser l'imprimante
    CENTER: [0x1B, 0x61, 0x01], // Centrer le texte
    LEFT: [0x1B, 0x61, 0x00], // Aligner à gauche
    BOLD_ON: [0x1B, 0x45, 0x01], // Gras ON
    BOLD_OFF: [0x1B, 0x45, 0x00], // Gras OFF
    SIZE_DOUBLE: [0x1D, 0x21, 0x11], // Taille double
    SIZE_NORMAL: [0x1D, 0x21, 0x00], // Taille normale
    CUT: [0x1D, 0x56, 0x42, 0x00], // Couper le papier
    LINE_FEED: [0x0A], // Saut de ligne
    LINE_SEPARATOR: '----------------------------------------'
  }

  const connectToPrinter = async () => {
    try {
      if (!navigator.usb) {
        toast({
          title: "WebUSB non supporté",
          description: "Votre navigateur ne supporte pas WebUSB. Utilisez Chrome ou Edge.",
          variant: "destructive"
        })
        return null
      }

      // Demander l'accès à l'imprimante USB
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
        ]
      })

      await device.open()
      await device.selectConfiguration(1)
      await device.claimInterface(0)
      
      setPrinterConnected(true)
      return device
    } catch (error) {
      console.error('Erreur connexion imprimante:', error)
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter à l'imprimante",
        variant: "destructive"
      })
      return null
    }
  }

  const formatTicketData = (data: TicketData): Uint8Array => {
    const encoder = new TextEncoder()
    const commands: number[] = []

    // Initialiser l'imprimante
    commands.push(...ESC_POS.INIT)
    
    // En-tête centré et en gras
    commands.push(...ESC_POS.CENTER, ...ESC_POS.BOLD_ON, ...ESC_POS.SIZE_DOUBLE)
    commands.push(...encoder.encode('CONFIRMATION RDV'))
    commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    
    // Retour au format normal et alignement gauche
    commands.push(...ESC_POS.SIZE_NORMAL, ...ESC_POS.BOLD_OFF, ...ESC_POS.LEFT)
    
    // Séparateur
    commands.push(...encoder.encode(ESC_POS.LINE_SEPARATOR))
    commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    
    // Informations patient
    commands.push(...ESC_POS.BOLD_ON)
    commands.push(...encoder.encode('PATIENT:'))
    commands.push(...ESC_POS.BOLD_OFF)
    commands.push(...ESC_POS.LINE_FEED)
    commands.push(...encoder.encode(`${data.firstName} ${data.lastName}`))
    commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    
    // Date et heure
    commands.push(...ESC_POS.BOLD_ON)
    commands.push(...encoder.encode('DATE ET HEURE:'))
    commands.push(...ESC_POS.BOLD_OFF)
    commands.push(...ESC_POS.LINE_FEED)
    commands.push(...encoder.encode(`${data.date} à ${data.time}`))
    commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    
    // Service si disponible
    if (data.service) {
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...encoder.encode('SERVICE:'))
      commands.push(...ESC_POS.BOLD_OFF)
      commands.push(...ESC_POS.LINE_FEED)
      commands.push(...encoder.encode(data.service))
      commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    }
    
    // Séparateur final
    commands.push(...encoder.encode(ESC_POS.LINE_SEPARATOR))
    commands.push(...ESC_POS.LINE_FEED)
    
    // Pied de page centré
    commands.push(...ESC_POS.CENTER)
    commands.push(...encoder.encode('Merci de votre confiance'))
    commands.push(...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED, ...ESC_POS.LINE_FEED)
    
    // Couper le papier
    commands.push(...ESC_POS.CUT)
    
    return new Uint8Array(commands)
  }

  const printTicket = async () => {
    setIsPrinting(true)
    
    try {
      const device = await connectToPrinter()
      if (!device) {
        setIsPrinting(false)
        return
      }

      const printData = formatTicketData({
        firstName: ticketData.firstName,
        lastName: ticketData.lastName,
        date: ticketData.date,
        time: ticketData.time,
        service: ticketData.service
      })

      // Envoyer les données à l'imprimante
      await device.transferOut(1, printData)
      
      // Fermer la connexion
      await device.close()
      
      toast({
        title: "Ticket imprimé",
        description: "Le ticket de confirmation a été imprimé avec succès",
      })
      
      onPrintSuccess?.()
      
    } catch (error) {
      console.error('Erreur impression:', error)
      toast({
        title: "Erreur d'impression",
        description: "Impossible d'imprimer le ticket",
        variant: "destructive"
      })
    } finally {
      setIsPrinting(false)
      setPrinterConnected(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Impression Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div><strong>Patient:</strong> {ticketData.firstName} {ticketData.lastName}</div>
          <div><strong>Date:</strong> {ticketData.date}</div>
          <div><strong>Heure:</strong> {ticketData.time}</div>
          {ticketData.service && (
            <div><strong>Service:</strong> {ticketData.service}</div>
          )}
        </div>
        
        <Button 
          onClick={printTicket}
          disabled={isPrinting}
          className="w-full"
          variant="brand"
        >
          {isPrinting ? (
            "Impression en cours..."
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer le ticket
            </>
          )}
        </Button>
        
        {printerConnected && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Imprimante connectée
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Compatible avec les imprimantes POS Epson connectées via USB
        </p>
      </CardContent>
    </Card>
  )
}