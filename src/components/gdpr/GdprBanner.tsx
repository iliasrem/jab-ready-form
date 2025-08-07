import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Cookie, Shield, Eye, FileText } from 'lucide-react'

export const GdprBanner = () => {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('gdpr-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem('gdpr-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString()
    }))
    setShowBanner(false)
  }

  const acceptNecessary = () => {
    localStorage.setItem('gdpr-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">Protection de vos données personnelles</h3>
                  <p className="text-sm text-muted-foreground">
                    Nous utilisons des technologies essentielles pour le fonctionnement de notre site et, avec votre consentement, 
                    des outils d'analyse pour améliorer votre expérience.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={acceptAll} size="sm">
                    Accepter tout
                  </Button>
                  <Button onClick={acceptNecessary} variant="outline" size="sm">
                    Accepter les essentiels
                  </Button>
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    size="sm"
                  >
                    Paramétrer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Paramètres de confidentialité</span>
            </DialogTitle>
            <DialogDescription>
              Gérez vos préférences de confidentialité et découvrez vos droits RGPD
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Catégories de données</span>
              </h4>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Cookies essentiels</span>
                    <Badge variant="secondary">Obligatoire</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nécessaires au fonctionnement du site (authentification, préférences)
                  </p>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Données d'analyse</span>
                    <Badge variant="outline">Optionnel</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nous aident à comprendre l'utilisation du site pour l'améliorer
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Vos droits RGPD</span>
              </h4>
              
              <div className="grid gap-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Droit d'accès :</strong> Vous pouvez demander l'accès à vos données personnelles
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Droit de rectification :</strong> Vous pouvez demander la correction de données inexactes
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Droit de portabilité :</strong> Vous pouvez récupérer vos données dans un format structuré
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-3">
                Pour exercer ces droits, contactez-nous à : <strong>rgpd@example.com</strong>
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button onClick={acceptAll} className="flex-1">
                Accepter tout
              </Button>
              <Button onClick={acceptNecessary} variant="outline" className="flex-1">
                Essentiels uniquement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}