import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireStaff?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireStaff = false }: ProtectedRouteProps) {
  const { user, isAdmin, hasRole, isLoading, hasAccess, accessDeniedReason, profile } = useAuth();
  const isMaster = isAdmin || hasRole("master");
  const isStaff = isMaster || hasRole("tutor") || hasRole("cs");
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

  // Force password change redirect
  if (profile?.must_change_password) {
    return <Navigate to="/auth" replace />;
  }

  // Onboarding redirect (skip for admins/masters)
  if (profile && !profile.onboarding_completed && !isMaster && !requireAdmin) {
    // Only redirect if not already on onboarding
    if (location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Admin route check (admin or master can access)
  if (requireAdmin && !isMaster) {
    return <Navigate to="/app" replace />;
  }

  // Staff route check (admin, master, tutor, cs)
  if (requireStaff && !isStaff) {
    return <Navigate to="/app" replace />;
  }

  // Access check (not for admin routes, admins/masters bypass this, onboarding bypasses this)
  if (!requireAdmin && !hasAccess && !isMaster && location.pathname !== "/onboarding") {
    return <Navigate to="/acesso-bloqueado" state={{ reason: accessDeniedReason }} replace />;
  }

  return <>{children}</>;
}
