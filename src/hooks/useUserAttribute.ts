import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useUserAttribute(attribute: string): boolean {
  const { user } = useAuth();
  const [value, setValue] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("user_attributes")
      .select("value")
      .eq("user_id", user.id)
      .eq("attribute", attribute)
      .maybeSingle()
      .then(({ data }) => {
        setValue(data?.value === "true");
      });
  }, [user?.id, attribute]);

  return value;
}
