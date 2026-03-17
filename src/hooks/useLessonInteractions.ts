import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InteractionData {
  liked: boolean;
  likeCount: number;
  favorited: boolean;
}

type InteractionsMap = Record<string, InteractionData>;

export function useLessonInteractions(lessonIds: string[]) {
  const [interactions, setInteractions] = useState<InteractionsMap>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const key = lessonIds.join(",");

  useEffect(() => {
    if (lessonIds.length === 0) return;
    fetchInteractions();
  }, [key, userId]);

  const fetchInteractions = async () => {
    const [likesRes, favsRes] = await Promise.all([
      (supabase as any).from("lesson_likes").select("lesson_id, user_id").in("lesson_id", lessonIds),
      userId
        ? (supabase as any).from("lesson_favorites").select("lesson_id").eq("user_id", userId).in("lesson_id", lessonIds)
        : Promise.resolve({ data: [] }),
    ]);

    const allLikes: { lesson_id: string; user_id: string }[] = likesRes.data || [];
    const favSet = new Set<string>((favsRes.data || []).map((f: any) => f.lesson_id));

    const result: InteractionsMap = {};
    for (const id of lessonIds) {
      const lessonLikes = allLikes.filter((l) => l.lesson_id === id);
      result[id] = {
        liked: userId ? lessonLikes.some((l) => l.user_id === userId) : false,
        likeCount: lessonLikes.length,
        favorited: favSet.has(id),
      };
    }
    setInteractions(result);
  };

  const toggleLike = useCallback(
    async (lessonId: string) => {
      if (!userId) return;
      const current = interactions[lessonId];
      if (!current) return;
      // Optimistic update
      setInteractions((prev) => ({
        ...prev,
        [lessonId]: {
          ...prev[lessonId],
          liked: !current.liked,
          likeCount: current.liked ? current.likeCount - 1 : current.likeCount + 1,
        },
      }));
      if (current.liked) {
        await (supabase as any)
          .from("lesson_likes")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("user_id", userId);
      } else {
        await (supabase as any)
          .from("lesson_likes")
          .insert({ lesson_id: lessonId, user_id: userId });
      }
    },
    [userId, interactions]
  );

  const toggleFavorite = useCallback(
    async (lessonId: string) => {
      if (!userId) return;
      const current = interactions[lessonId];
      if (!current) return;
      // Optimistic update
      setInteractions((prev) => ({
        ...prev,
        [lessonId]: { ...prev[lessonId], favorited: !current.favorited },
      }));
      if (current.favorited) {
        await (supabase as any)
          .from("lesson_favorites")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("user_id", userId);
      } else {
        await (supabase as any)
          .from("lesson_favorites")
          .insert({ lesson_id: lessonId, user_id: userId });
      }
    },
    [userId, interactions]
  );

  return { interactions, toggleLike, toggleFavorite };
}
