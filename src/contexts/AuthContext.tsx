import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  access_status: 'active' | 'suspended';
  is_mentorado: boolean;
  is_w3_client: boolean;
  plan_type: 'free' | 'paid' | 'manual';
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profileData as Profile | null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data === true;
    } catch (err) {
      console.error('Error in checkIsAdmin:', err);
      return false;
    }
  };

  const checkAccess = (userProfile: Profile | null, adminStatus: boolean): { hasAccess: boolean; reason: string | null } => {
    // Admins always have access
    if (adminStatus) {
      return { hasAccess: true, reason: null };
    }

    if (!userProfile) {
      return { hasAccess: false, reason: 'Perfil não encontrado' };
    }

    // Check if suspended
    if (userProfile.access_status === 'suspended') {
      return { hasAccess: false, reason: 'Acesso suspenso' };
    }

    // Check if expired
    if (userProfile.access_expires_at) {
      const expiresAt = new Date(userProfile.access_expires_at);
      if (expiresAt < new Date()) {
        return { hasAccess: false, reason: 'Assinatura expirada' };
      }
    }

    // Check plan - if free and not mentorado/w3_client, need payment
    if (userProfile.plan_type === 'free' && !userProfile.is_mentorado && !userProfile.is_w3_client) {
      return { hasAccess: false, reason: 'Pagamento necessário' };
    }

    return { hasAccess: true, reason: null };
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
    
    const adminStatus = await checkIsAdmin(user.id);
    setIsAdmin(adminStatus);
    
    const accessCheck = checkAccess(profileData, adminStatus);
    setHasAccess(accessCheck.hasAccess);
    setAccessDeniedReason(accessCheck.reason);
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer fetching to avoid deadlock
          setTimeout(async () => {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
            
            const adminStatus = await checkIsAdmin(newSession.user.id);
            setIsAdmin(adminStatus);
            
            const accessCheck = checkAccess(profileData, adminStatus);
            setHasAccess(accessCheck.hasAccess);
            setAccessDeniedReason(accessCheck.reason);
            
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setHasAccess(false);
          setAccessDeniedReason(null);
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        const profileData = await fetchProfile(existingSession.user.id);
        setProfile(profileData);
        
        const adminStatus = await checkIsAdmin(existingSession.user.id);
        setIsAdmin(adminStatus);
        
        const accessCheck = checkAccess(profileData, adminStatus);
        setHasAccess(accessCheck.hasAccess);
        setAccessDeniedReason(accessCheck.reason);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
