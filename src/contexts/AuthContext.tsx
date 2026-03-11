import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  access_status: "active" | "suspended";
  is_mentorado: boolean;
  is_w3_client: boolean;
  plan_type: "free" | "paid" | "manual";
  access_expires_at: string | null;
  last_login_at: string | null;
  must_change_password: boolean;
  is_ecommerce: boolean | null;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  userRoles: string[];
  hasRole: (role: string) => boolean;
  isLoading: boolean;
  hasAccess: boolean;
  accessDeniedReason: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INTERNAL_ROLES = ["admin", "master", "tutor", "cs"];
const CLIENT_ROLES = ["cliente_w3", "cliente_ames"];

const checkAccess = (
  userProfile: Profile | null,
  roles: string[],
): { hasAccess: boolean; reason: string | null } => {
  // Internal staff always have access
  if (roles.some((r) => INTERNAL_ROLES.includes(r))) return { hasAccess: true, reason: null };

  if (!userProfile) return { hasAccess: false, reason: "Perfil não encontrado" };
  if (userProfile.access_status === "suspended") return { hasAccess: false, reason: "Acesso suspenso" };
  if (userProfile.access_expires_at) {
    const expiresAt = new Date(userProfile.access_expires_at);
    if (expiresAt < new Date()) return { hasAccess: false, reason: "Assinatura expirada" };
  }

  // External clients: must have at least cliente_w3
  if (roles.some((r) => CLIENT_ROLES.includes(r))) return { hasAccess: true, reason: null };

  // Legacy fallback: honour old plan_type/flags for accounts not yet migrated
  if (userProfile.is_mentorado || userProfile.is_w3_client || userProfile.plan_type !== "free") {
    return { hasAccess: true, reason: null };
  }

  return { hasAccess: false, reason: "Sem plano ativo" };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);
  const [needsProfileRefresh, setNeedsProfileRefresh] = useState(false);

  const hasRole = (role: string) => userRoles.includes(role);

  const refreshProfile = async () => {
    if (!user) return;
    setNeedsProfileRefresh(true);
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession?.user) {
        setProfile(null);
        setIsAdmin(false);
        setUserRoles([]);
        setHasAccess(false);
        setAccessDeniedReason(null);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setNeedsProfileRefresh(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        setNeedsProfileRefresh(true);
      } else {
        setIsLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!needsProfileRefresh || !user) return;
    let mounted = true;

    const fetchUserData = async () => {
      try {
        const [profileResult, rolesResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
        ]);

        if (!mounted) return;

        if (profileResult.error) {
          console.error("Error fetching profile:", profileResult.error);
          setProfile(null);
          setHasAccess(false);
          setAccessDeniedReason("Erro ao buscar perfil");
          setIsLoading(false);
          setNeedsProfileRefresh(false);
          return;
        }

        let typedProfile = profileResult.data as unknown as Profile | null;

        if (!typedProfile) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([{
              user_id: user.id,
              email: user.email,
              access_status: "active",
              is_mentorado: false,
              is_w3_client: false,
              plan_type: "free",
            }])
            .select()
            .single();

          if (!mounted) return;
          if (createError) {
            console.error("Error creating profile:", createError);
            setProfile(null);
            setHasAccess(false);
            setAccessDeniedReason("Erro ao criar perfil");
            setIsLoading(false);
            setNeedsProfileRefresh(false);
            return;
          }
          typedProfile = newProfile as unknown as Profile;
        }

        setProfile(typedProfile);

        const roles = (rolesResult.data ?? []).map((r) => r.role as string);
        setUserRoles(roles);

        const adminStatus = roles.includes("admin");
        setIsAdmin(adminStatus);

        const accessCheck = checkAccess(typedProfile, roles);
        setHasAccess(accessCheck.hasAccess);
        setAccessDeniedReason(accessCheck.reason);

        supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", user.id);
      } catch (err) {
        if (!mounted) return;
        console.error("Error in fetchUserData:", err);
        setProfile(null);
        setHasAccess(false);
        setAccessDeniedReason("Erro ao buscar dados do usuário");
      } finally {
        if (mounted) {
          setIsLoading(false);
          setNeedsProfileRefresh(false);
        }
      }
    };

    fetchUserData();
    return () => { mounted = false; };
  }, [needsProfileRefresh, user]);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, userRoles, hasRole, isLoading, hasAccess, accessDeniedReason, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
