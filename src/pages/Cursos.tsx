import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Bookmark, Play, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AMES_ROLES = ["admin", "master", "tutor", "cs", "cliente_ames"];

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  cover_url: string | null;
  order: number;
}

interface FavoriteLesson {
  favoriteId: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  courseSlug: string;
}

export default function Cursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(false);
  const { isAdmin } = useAdminStatus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRoles, isLoading: authLoading } = useAuth();

  const hasAmesAccess = userRoles.some((r) => AMES_ROLES.includes(r));

  useEffect(() => {
    if (!authLoading && !hasAmesAccess) {
      navigate("/app/upgrade/w3-educacao", { replace: true });
    }
  }, [authLoading, hasAmesAccess]);

  useEffect(() => {
    if (!authLoading && hasAmesAccess) fetchCourses();
  }, [authLoading, hasAmesAccess]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("order");
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Erro ao carregar cursos:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os cursos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    setFavLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("lesson_favorites")
        .select(`
          id,
          lesson_id,
          lessons (
            title,
            course_modules (
              title,
              courses (
                title,
                slug
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: FavoriteLesson[] = (data || []).map((row: any) => ({
        favoriteId: row.id,
        lessonId: row.lesson_id,
        lessonTitle: row.lessons?.title ?? "",
        moduleTitle: row.lessons?.course_modules?.title ?? "",
        courseTitle: row.lessons?.course_modules?.courses?.title ?? "",
        courseSlug: row.lessons?.course_modules?.courses?.slug ?? "",
      }));

      setFavorites(mapped);
    } catch (error) {
      console.error("Erro ao carregar favoritos:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os favoritos.", variant: "destructive" });
    } finally {
      setFavLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    await (supabase as any).from("lesson_favorites").delete().eq("id", favoriteId);
    setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId));
    toast({ title: "Removido dos favoritos" });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6 max-w-5xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div>
        <h1 className="page-title">W3 Educação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha um curso para continuar aprendendo
        </p>
      </div>

      <Tabs defaultValue="cursos">
        <TabsList>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="favoritos" onClick={fetchFavorites}>
            <Bookmark className="h-4 w-4 mr-1.5" />
            Favoritos
          </TabsTrigger>
        </TabsList>

        {/* Courses tab */}
        <TabsContent value="cursos" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                onClick={() => navigate(`/app/aulas/${course.slug}`)}
              >
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {course.cover_url ? (
                    <img src={course.cover_url} alt={course.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <GraduationCap className="h-12 w-12 text-primary/40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
                <CardContent className="p-4 relative -mt-6">
                  <h3 className="text-lg font-bold">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                  )}
                  <Button size="sm" className="mt-3 w-full" variant="outline">
                    Acessar Curso
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Favorites tab */}
        <TabsContent value="favoritos" className="mt-4">
          {favLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Você ainda não favoritou nenhuma aula</p>
              <p className="text-sm mt-1">Dentro de cada aula, clique no ícone de marcador para salvar aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((fav) => (
                <Card key={fav.favoriteId}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{fav.lessonTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {fav.moduleTitle} · {fav.courseTitle}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/app/aulas/${fav.courseSlug}`)}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Assistir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeFavorite(fav.favoriteId)}
                        title="Remover favorito"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
