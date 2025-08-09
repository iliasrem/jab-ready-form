import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Button asChild>
          <Link to="/">Retour à l’accueil</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
