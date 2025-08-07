import { useAuth } from './AuthProvider'
import { LoginForm } from './LoginForm'
import { Button } from '@/components/ui/button'
import { LogOut, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, signOut } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: 'Déconnexion réussie',
      description: 'Vous avez été déconnecté avec succès'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-3xl font-bold">Accès protégé</h1>
            <p className="text-muted-foreground mt-2">
              Cette interface est protégée et nécessite une authentification
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Administration</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Connecté en tant que {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}