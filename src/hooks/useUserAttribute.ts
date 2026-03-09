import { useAuth } from "@/contexts/AuthContext";

/**
 * @deprecated user_attributes table was removed. Use profile flags directly via useAuth().
 */
export function useUserAttribute(attribute: string): boolean {
  const { profile } = useAuth();
  if (!profile) return false;

  // Map known attributes to profile fields
  if (attribute === "is_mentorado") return profile.is_mentorado ?? false;
  if (attribute === "is_w3_client") return profile.is_w3_client ?? false;

  return false;
}
