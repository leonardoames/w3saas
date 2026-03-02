import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LikeData {
  [brandId: string]: { count: number; liked: boolean };
}

export function useBrandLikes(brandIds: string[]) {
  const [likes, setLikes] = useState<LikeData>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (brandIds.length === 0) return;
    fetchLikes();
  }, [brandIds.join(","), userId]);

  const fetchLikes = async () => {
    // Get all likes counts
    const { data: allLikes } = await (supabase as any)
      .from("brand_likes")
      .select("brand_id, user_id")
      .in("brand_id", brandIds);

    const result: LikeData = {};
    for (const id of brandIds) {
      const brandLikes = (allLikes || []).filter((l: any) => l.brand_id === id);
      result[id] = {
        count: brandLikes.length,
        liked: userId ? brandLikes.some((l: any) => l.user_id === userId) : false,
      };
    }
    setLikes(result);
  };

  const toggleLike = useCallback(
    async (brandId: string) => {
      if (!userId) return;
      const current = likes[brandId];
      if (!current) return;

      if (current.liked) {
        await (supabase as any)
          .from("brand_likes")
          .delete()
          .eq("brand_id", brandId)
          .eq("user_id", userId);
        setLikes((prev) => ({
          ...prev,
          [brandId]: { count: prev[brandId].count - 1, liked: false },
        }));
      } else {
        await (supabase as any)
          .from("brand_likes")
          .insert({ brand_id: brandId, user_id: userId });
        setLikes((prev) => ({
          ...prev,
          [brandId]: { count: prev[brandId].count + 1, liked: true },
        }));
      }
    },
    [userId, likes]
  );

  return { likes, toggleLike };
}
