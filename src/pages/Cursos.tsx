import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  cover_url: string | null;
  order: number;
}

export default function Cursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdminStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">W3 Educação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha um curso para continuar aprendendo
          </p>
        </div>
      </div>

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
    </div>
  );
}
