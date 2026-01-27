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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();

      if (error) throw error;

      setIsAdmin(data?.is_admin === true);
    } catch (error) {
      console.error("Erro ao verificar admin:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading };
}
