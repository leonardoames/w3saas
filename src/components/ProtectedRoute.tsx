import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, hasAccess, accessDeniedReason } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to landing/checkout
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Admin route check
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // Access check (not for admin routes, admins bypass this)
  if (!requireAdmin && !hasAccess && !isAdmin) {
    return <Navigate to="/acesso-bloqueado" state={{ reason: accessDeniedReason }} replace />;
  }

  return <>{children}</>;
}
