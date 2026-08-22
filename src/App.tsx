import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GdprBanner } from "@/components/gdpr/GdprBanner";
import AdminDashboard from "./pages/AdminDashboard";
import Calendar from "./pages/Calendar";
import PatientBooking from "./pages/PatientBooking";
import NotFound from "./pages/NotFound";
import AdminAvailabilityOverview from "./pages/AdminAvailabilityOverview";


const queryClient = new QueryClient();

const RootLayout = () => (
  <>
    <Outlet />
    <GdprBanner />
  </>
);

const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      // Route publique pour les patients - page d'accueil
      { path: "/", element: <PatientBooking /> },

      // Routes protégées pour l'administration
      { path: "/admin", element: (
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      ) },
      { path: "/calendar", element: (
        <ProtectedRoute>
          <Calendar />
        </ProtectedRoute>
      ) },
      { path: "/admin/disponibilites-vue", element: (
        <ProtectedRoute>
          <AdminAvailabilityOverview />
        </ProtectedRoute>
      ) },

      // Catch-all
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
