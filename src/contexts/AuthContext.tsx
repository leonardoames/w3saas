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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasAccess: boolean;
  accessDeniedReason: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);
  const [needsProfileRefresh, setNeedsProfileRefresh] = useState(false);

  const checkAccess = (
    userProfile: Profile | null,
    adminStatus: boolean,
  ): { hasAccess: boolean; reason: string | null } => {
    if (adminStatus) {
      return { hasAccess: true, reason: null };
    }

    if (!userProfile) {
      return { hasAccess: false, reason: "Perfil não encontrado" };
    }

    if (userProfile.access_status === "suspended") {
      return { hasAccess: false, reason: "Acesso suspenso" };
    }

    if (userProfile.access_expires_at) {
      const expiresAt = new Date(userProfile.access_expires_at);
      if (expiresAt < new Date()) {
        return { hasAccess: false, reason: "Assinatura expirada" };
      }
    }

    if (userProfile.plan_type === "free" && !userProfile.is_mentorado && !userProfile.is_w3_client) {
      return { hasAccess: false, reason: "Pagamento necessário" };
    }

    return { hasAccess: true, reason: null };
  };

  const refreshProfile = async () => {
    if (!user) return;
    setNeedsProfileRefresh(true);
  };

  // Efeito separado para lidar com o auth state change
  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      console.log("Auth state changed:", event);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setProfile(null);
        setIsAdmin(false);
        setHasAccess(false);
        setAccessDeniedReason(null);
        setIsLoading(false);
      } else {
        // Sinaliza que precisa atualizar o perfil
        setNeedsProfileRefresh(true);
      }
    });

    // Busca a sessão inicial
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Array vazio - executa apenas uma vez

  // Efeito separado para buscar perfil (evita deadlock)
  useEffect(() => {
    if (!needsProfileRefresh || !user) return;

    let mounted = true;

    const fetchUserData = async () => {
      try {
        // Busca o perfil
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setProfile(null);
          setHasAccess(false);
          setAccessDeniedReason("Erro ao buscar perfil");
          setIsLoading(false);
          setNeedsProfileRefresh(false);
          return;
        }

        // Se não existe perfil, tenta criar um padrão
        if (!profileData) {
          console.log("Profile not found, creating one...");

          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([
              {
                user_id: user.id,
                email: user.email,
                access_status: "active",
                is_mentorado: false,
                is_w3_client: false,
                plan_type: "free",
              },
            ])
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

          setProfile(newProfile as Profile);
        } else {
          setProfile(profileData as Profile);
        }

        // Busca status de admin
        const { data: adminData, error: adminError } = await supabase.rpc("is_admin", { _user_id: user.id });

        if (!mounted) return;

        const adminStatus = adminError ? false : adminData === true;
        setIsAdmin(adminStatus);

        // Verifica acesso
        const accessCheck = checkAccess((profileData as Profile) || null, adminStatus);
        setHasAccess(accessCheck.hasAccess);
        setAccessDeniedReason(accessCheck.reason);

        // Atualiza last_login_at
        await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", user.id);
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

    return () => {
      mounted = false;
    };
  }, [needsProfileRefresh, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        hasAccess,
        accessDeniedReason,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
