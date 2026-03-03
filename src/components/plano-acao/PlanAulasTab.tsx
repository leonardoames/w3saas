import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, BookOpen, ExternalLink } from "lucide-react";
import { SearchLessonsDialog } from "./SearchLessonsDialog";

interface LinkedLesson {
  id: string;
  lesson_id: string;
  notes: string | null;
  lesson_title: string;
  module_title: string;
  course_title: string;
}

interface PlanAulasTabProps {
  userId: string;
}

export function PlanAulasTab({ userId }: PlanAulasTabProps) {
  const [linkedLessons, setLinkedLessons] = useState<LinkedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();

  const fetchLinkedLessons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_aulas")
      .select("id, lesson_id, notes, lessons(title, course_modules(title, courses(title)))")
      .eq("user_id", userId)
      .order("created_at");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const mapped: LinkedLesson[] = (data || []).map((r: any) => ({
      id: r.id,
      lesson_id: r.lesson_id,
      notes: r.notes,
      lesson_title: r.lessons?.title || "Aula removida",
      module_title: r.lessons?.course_modules?.title || "",
      course_title: r.lessons?.course_modules?.courses?.title || "",
    }));

    setLinkedLessons(mapped);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchLinkedLessons(); }, [fetchLinkedLessons]);

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("plan_aulas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } else {
      toast({ title: "Aula removida do plano" });
      fetchLinkedLessons();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setSearchOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Vincular aulas
      </Button>

      {linkedLessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma aula vinculada ainda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {linkedLessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{lesson.lesson_title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lesson.course_title} › {lesson.module_title}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(lesson.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SearchLessonsDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        userId={userId}
        linkedLessonIds={linkedLessons.map((l) => l.lesson_id)}
        onLinked={fetchLinkedLessons}
      />
    </div>
  );
}
