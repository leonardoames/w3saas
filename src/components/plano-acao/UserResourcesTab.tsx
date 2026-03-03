import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, BookOpen, ExternalLink, FileSpreadsheet, Lightbulb, Wrench } from "lucide-react";

interface LinkedLesson {
  id: string;
  lesson_title: string;
  module_title: string;
  course_title: string;
}

interface Ferramenta {
  id: string;
  title: string;
  description: string | null;
  type: string;
  file_url: string | null;
  external_url: string | null;
}

const typeConfig: Record<string, { label: string; icon: typeof Wrench }> = {
  planilha: { label: "Planilha", icon: FileSpreadsheet },
  solucao: { label: "Solução", icon: Lightbulb },
  ferramenta: { label: "Ferramenta", icon: Wrench },
};

export function UserResourcesTab() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<LinkedLesson[]>([]);
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [lessonsRes, ferramentasRes] = await Promise.all([
      supabase
        .from("plan_aulas")
        .select("id, lessons(title, course_modules(title, courses(title)))")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("plan_ferramentas")
        .select("id, title, description, type, file_url, external_url")
        .eq("user_id", user.id)
        .order("created_at"),
    ]);

    if (lessonsRes.data) {
      setLessons(
        lessonsRes.data.map((r: any) => ({
          id: r.id,
          lesson_title: r.lessons?.title || "Aula removida",
          module_title: r.lessons?.course_modules?.title || "",
          course_title: r.lessons?.course_modules?.courses?.title || "",
        }))
      );
    }

    if (ferramentasRes.data) {
      setFerramentas(ferramentasRes.data as any);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasContent = lessons.length > 0 || ferramentas.length > 0;

  if (!hasContent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum recurso atribuído ainda
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aulas e ferramentas serão adicionadas pelo seu tutor
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {lessons.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Aulas Recomendadas</h3>
          <div className="space-y-2">
            {lessons.map((l) => (
              <Card key={l.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.lesson_title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.course_title} › {l.module_title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {ferramentas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ferramentas</h3>
          <div className="space-y-2">
            {ferramentas.map((f) => {
              const cfg = typeConfig[f.type] || typeConfig.ferramenta;
              const Icon = cfg.icon;
              return (
                <Card key={f.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{f.title}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">{cfg.label}</Badge>
                      </div>
                      {f.description && (
                        <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                      )}
                    </div>
                    {(f.file_url || f.external_url) && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={f.file_url || f.external_url || "#"} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
