import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, Circle, Play, Plus, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { AddLessonModal } from "@/components/AddLessonModal";

interface Lesson {
  id: string;
  title: string;
  description: string;
  panda_video_id: string;
  duration: string;
  completed: boolean;
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export default function Aulas() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedModuleTitle, setSelectedModuleTitle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchModulesAndLessons();
  }, []);

  const fetchModulesAndLessons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .order('order');

      if (modulesError) throw modulesError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('order');

      if (lessonsError) throw lessonsError;

      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const modulesWithLessons: Module[] = (modulesData || []).map(module => ({
        ...module,
        lessons: (lessonsData || [])
          .filter(lesson => lesson.module_id === module.id)
          .map(lesson => ({
            ...lesson,
            completed: progressData?.some(
              p => p.lesson_id === lesson.id && p.completed
            ) || false,
          })),
      }));

      setModules(modulesWithLessons);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as aulas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonComplete = async (moduleId: string, lessonId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const lesson = modules
        .find(m => m.id === moduleId)
        ?.lessons.find(l => l.id === lessonId);

      if (!lesson) return;

      if (lesson.completed) {
        await supabase
          .from('lesson_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId);
      } else {
        await supabase
          .from('lesson_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
          });
      }

      setModules(prevModules =>
        prevModules.map(module =>
          module.id === moduleId
            ? {
                ...module,
                lessons: module.lessons.map(l =>
                  l.id === lessonId ? { ...l, completed: !l.completed } : l
                ),
              }
            : module
        )
      );

      toast({
        title: lesson.completed ? "Aula desmarcada" : "🎉 Aula concluída!",
        description: lesson.completed
          ? "Aula desmarcada como concluída"
          : "Parabéns! Continue assim.",
      });
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o progresso.",
        variant: "destructive",
      });
    }
  };

  const handleAddLesson = (moduleId: string, moduleTitle: string) => {
    setSelectedModuleId(moduleId);
    setSelectedModuleTitle(moduleTitle);
    setIsAddModalOpen(true);
  };

  const watchLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessons = modules.reduce(
    (sum, module) => sum + module.lessons.filter(l => l.completed).length,
    0
  );
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Aulas da Mentoria</h1>
        <p className="text-muted-foreground">
          Acesse todo o conteúdo da mentoria e acompanhe seu progresso
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedLessons} de {totalLessons} aulas concluídas
            </span>
            <span className="text-sm font-medium">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {modules.map((module) => {
          const moduleCompletedCount = module.lessons.filter(l => l.completed).length;
          const moduleProgress =
            module.lessons.length > 0
              ? (moduleCompletedCount / module.lessons.length) * 100
              : 0;

          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    {moduleCompletedCount === module.lessons.length &&
                    module.lessons.length > 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3 mr-4">
                    <span className="text-sm text-muted-foreground">
                      {moduleCompletedCount}/{module.lessons.length}
                    </span>
                    <Progress value={moduleProgress} className="w-20 h-2" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="space-y-3 pb-4">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        lesson.completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {lesson.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">{lesson.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {lesson.description}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            ⏱️ {lesson.duration}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => watchLesson(lesson)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Assistir
                        </Button>
                        <Button
                          variant={lesson.completed ? "secondary" : "default"}
                          size="sm"
                          onClick={() => toggleLessonComplete(module.id, lesson.id)}
                        >
                          {lesson.completed ? "Desmarcar" : "Concluir"}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => handleAddLesson(module.id, module.title)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      ➕ Adicionar Nova Aula
                    </Button>
                  )}

                  {module.lessons.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma aula disponível ainda</p>
                      {isAdmin && (
                        <p className="text-sm mt-1">
                          Clique em "Adicionar Nova Aula" para começar
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {isAdmin && (
        <AddLessonModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          moduleId={selectedModuleId}
          moduleTitle={selectedModuleTitle}
          onSuccess={fetchModulesAndLessons}
        />
      )}

      {selectedLesson && (
        <VideoPlayerModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onComplete={() => {
            const module = modules.find(m => 
              m.lessons.some(l => l.id === selectedLesson.id)
            );
            if (module) {
              toggleLessonComplete(module.id, selectedLesson.id);
            }
          }}
        />
      )}
    </div>
  );
}

interface VideoPlayerModalProps {
  lesson: Lesson;
  onClose: () => void;
  onComplete: () => void;
}

function VideoPlayerModal({ lesson, onClose, onComplete }: VideoPlayerModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">{lesson.title}</h2>
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="aspect-video bg-black">
          <iframe
            src={`https://player-vz-7b6cf909-4a4.tv.pandavideo.com.br/embed/?v=${lesson.panda_video_id}`}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            ⏱️ {lesson.duration}
          </span>
          <Button onClick={onComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como Concluída
          </Button>
        </div>
      </div>
    </div>
  );
}
