import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Usar a função RPC segura que verifica a tabela user_roles
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });

      if (error) throw error;

      setIsAdmin(data === true);
    } catch (error) {
      console.error('Erro ao verificar admin:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading };
}
