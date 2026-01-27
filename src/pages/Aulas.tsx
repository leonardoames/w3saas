import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Play, Plus, Lock, Loader2, Pencil, Trash2, MoreVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { AddLessonModal } from "@/components/AddLessonModal";
import { AddModuleModal } from "@/components/aulas/AddModuleModal";
import { EditModuleModal } from "@/components/aulas/EditModuleModal";
import { EditLessonModal } from "@/components/aulas/EditLessonModal";
import { ConfirmDeleteDialog } from "@/components/aulas/ConfirmDeleteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const PANDA_EMBED_BASE = "https://player-vz-75e71015-90c.tv.pandavideo.com.br/embed/?v=";

function normalizePandaEmbed(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  // If the admin pasted the full <iframe ...> snippet, extract the src.
  if (raw.startsWith("<")) {
    const match = raw.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const extracted = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
    if (extracted) return extracted;
  }

  // If already a URL, use as-is.
  if (/^https?:\/\//i.test(raw)) return raw;

  // Otherwise assume it's the Panda Video "v" id (UUID).
  const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const videoId = (uuidMatch?.[0] ?? raw).trim();
  return `${PANDA_EMBED_BASE}${encodeURIComponent(videoId)}`;
}

export default function Aulas() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const { toast } = useToast();

  // Add Lesson Modal
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedModuleTitle, setSelectedModuleTitle] = useState<string>("");

  // Add Module Modal
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);

  // Edit Module Modal
  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);

  // Edit Lesson Modal
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);

  // Delete Module Dialog
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  // Delete Lesson Dialog
  const [isDeleteLessonDialogOpen, setIsDeleteLessonDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  useEffect(() => {
    fetchModulesAndLessons();
  }, []);

  const fetchModulesAndLessons = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .order("order");

      if (modulesError) throw modulesError;

      const { data: lessonsData, error: lessonsError } = await supabase.from("lessons").select("*").order("order");

      if (lessonsError) throw lessonsError;

      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressError) throw progressError;

      const modulesWithLessons = modulesData.map((module) => ({
        ...module,
        lessons: lessonsData
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({
            ...lesson,
            completed: progressData?.some((p) => p.lesson_id === lesson.id && p.completed) || false,
          })),
      }));

      setModules(modulesWithLessons);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);

      if (!lesson) return;

      if (lesson.completed) {
        await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      } else {
        await supabase.from("lesson_progress").insert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
        });
      }

      setModules((prevModules) =>
        prevModules.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                lessons: module.lessons.map((l) => (l.id === lessonId ? { ...l, completed: !l.completed } : l)),
              }
            : module,
        ),
      );

      toast({
        title: lesson.completed ? "Aula desmarcada" : "🎉 Aula concluída!",
        description: lesson.completed ? "Aula desmarcada como concluída" : "Parabéns! Continue assim.",
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o progresso.",
        variant: "destructive",
      });
    }
  };

  // Add Lesson handlers
  const handleAddLesson = (moduleId: string, moduleTitle: string) => {
    setSelectedModuleId(moduleId);
    setSelectedModuleTitle(moduleTitle);
    setIsAddLessonModalOpen(true);
  };

  // Edit Module handlers
  const handleEditModule = (module: Module) => {
    setModuleToEdit(module);
    setIsEditModuleModalOpen(true);
  };

  // Delete Module handlers
  const handleDeleteModule = (module: Module) => {
    setModuleToDelete(module);
    setIsDeleteModuleDialogOpen(true);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const deletingModuleId = moduleToDelete.id;
    setIsDeletingModule(true);

    try {
      // First delete all lessons in the module
      const { error: lessonsError } = await supabase
        .from("lessons")
        .delete()
        .eq("module_id", deletingModuleId);

      if (lessonsError) throw lessonsError;

      // Then delete the module
      const { error: moduleError } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", deletingModuleId);

      if (moduleError) throw moduleError;

      // Update state optimistically to remove module from UI immediately
      setModules((prevModules) => prevModules.filter((m) => m.id !== deletingModuleId));

      toast({
        title: "✅ Módulo excluído!",
        description: "O módulo e suas aulas foram removidos com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir módulo:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível excluir o módulo.",
        variant: "destructive",
      });
      // Refresh to ensure UI is in sync with backend
      fetchModulesAndLessons();
    } finally {
      setIsDeletingModule(false);
      setIsDeleteModuleDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  // Edit Lesson handlers
  const handleEditLesson = (lesson: Lesson) => {
    setLessonToEdit(lesson);
    setIsEditLessonModalOpen(true);
  };

  // Delete Lesson handlers
  const handleDeleteLesson = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setIsDeleteLessonDialogOpen(true);
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    setIsDeletingLesson(true);

    try {
      // First delete progress records for this lesson
      const { error: progressError } = await supabase
        .from("lesson_progress")
        .delete()
        .eq("lesson_id", lessonToDelete.id);

      if (progressError) throw progressError;

      // Then delete the lesson
      const { error: lessonError } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonToDelete.id);

      if (lessonError) throw lessonError;

      toast({
        title: "✅ Aula excluída!",
        description: "A aula foi removida com sucesso.",
      });

      fetchModulesAndLessons();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível excluir a aula.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingLesson(false);
      setIsDeleteLessonDialogOpen(false);
      setLessonToDelete(null);
    }
  };

  const watchLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessons = modules.reduce((sum, module) => sum + module.lessons.filter((l) => l.completed).length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Aulas da Mentoria</h1>
          <p className="mt-2 text-muted-foreground">Acesse todo o conteúdo da mentoria e acompanhe seu progresso</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddModuleModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Módulo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedLessons} de {totalLessons} aulas concluídas
            </span>
            <span className="text-sm font-semibold text-primary">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {modules.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum módulo disponível</p>
            {isAdmin && (
              <p className="text-sm mt-2">Clique em "Novo Módulo" para começar a criar o curso.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Accordion type="single" collapsible className="space-y-4">
        {modules.map((module) => {
          const moduleCompletedCount = module.lessons.filter((l) => l.completed).length;
          const moduleProgress = module.lessons.length > 0 ? (moduleCompletedCount / module.lessons.length) * 100 : 0;

          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3 text-left">
                    {moduleCompletedCount === module.lessons.length && module.lessons.length > 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <DropdownMenu>
                        {/*
                          Importante: AccordionTrigger é um <button>. Não podemos renderizar outro <button>
                          (ex: <Button/>) dentro dele, senão o click do dropdown falha.
                        */}
                        <DropdownMenuTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="Ações do módulo"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Ações do módulo</span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50 bg-popover border shadow-lg">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditModule(module); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar Módulo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(module); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Módulo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <div className="hidden sm:flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {moduleCompletedCount}/{module.lessons.length}
                      </span>
                      <Progress value={moduleProgress} className="w-20 h-2" />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-4">
                <div className="space-y-3">
                  {module.lessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className={`${lesson.completed ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                            {lesson.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold">{lesson.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                              <span className="text-xs text-muted-foreground mt-2 inline-block">
                                ⏱️ {lesson.duration}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto items-center">
                            <Button size="sm" onClick={() => watchLesson(lesson)} className="flex-1 sm:flex-none">
                              <Play className="mr-2 h-4 w-4" />
                              Assistir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleLessonComplete(module.id, lesson.id)}
                              className="flex-1 sm:flex-none"
                            >
                              {lesson.completed ? "Desmarcar" : "Concluir"}
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditLesson(lesson)}
                                  title="Editar Aula"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Editar Aula</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteLesson(lesson)}
                                  title="Excluir Aula"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Excluir Aula</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => handleAddLesson(module.id, module.title)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Nova Aula
                    </Button>
                  )}

                  {module.lessons.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma aula disponível ainda</p>
                      {isAdmin && <p className="text-sm mt-1">Clique em "Adicionar Nova Aula" para começar</p>}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Modals */}
      {isAdmin && (
        <>
          <AddLessonModal
            isOpen={isAddLessonModalOpen}
            onClose={() => setIsAddLessonModalOpen(false)}
            moduleId={selectedModuleId}
            moduleTitle={selectedModuleTitle}
            onSuccess={fetchModulesAndLessons}
          />

          <AddModuleModal
            isOpen={isAddModuleModalOpen}
            onClose={() => setIsAddModuleModalOpen(false)}
            onSuccess={fetchModulesAndLessons}
          />

          <EditModuleModal
            isOpen={isEditModuleModalOpen}
            onClose={() => setIsEditModuleModalOpen(false)}
            module={moduleToEdit}
            onSuccess={fetchModulesAndLessons}
          />

          <EditLessonModal
            isOpen={isEditLessonModalOpen}
            onClose={() => setIsEditLessonModalOpen(false)}
            lesson={lessonToEdit}
            onSuccess={fetchModulesAndLessons}
          />

          <ConfirmDeleteDialog
            isOpen={isDeleteModuleDialogOpen}
            onClose={() => setIsDeleteModuleDialogOpen(false)}
            onConfirm={confirmDeleteModule}
            title="Excluir Módulo"
            description={`Tem certeza que deseja excluir o módulo "${moduleToDelete?.title}"? Todas as aulas dentro dele também serão excluídas. Esta ação não pode ser desfeita.`}
            isDeleting={isDeletingModule}
          />

          <ConfirmDeleteDialog
            isOpen={isDeleteLessonDialogOpen}
            onClose={() => setIsDeleteLessonDialogOpen(false)}
            onConfirm={confirmDeleteLesson}
            title="Excluir Aula"
            description={`Tem certeza que deseja excluir a aula "${lessonToDelete?.title}"? O progresso dos alunos nesta aula também será removido. Esta ação não pode ser desfeita.`}
            isDeleting={isDeletingLesson}
          />
        </>
      )}

      {selectedLesson && (
        <VideoPlayerModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onComplete={() => {
            const module = modules.find((m) => m.lessons.some((l) => l.id === selectedLesson.id));
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
  const videoSrc = normalizePandaEmbed(lesson.panda_video_id);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="aspect-video bg-black">
          {videoSrc ? (
            <iframe
              title={lesson.title}
              src={videoSrc}
              style={{ border: "none", width: "100%", height: "100%" }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              Vídeo indisponível: URL/ID do Panda Video vazio.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button onClick={onComplete} className="bg-orange-600 hover:bg-orange-700 text-white">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como Concluída
          </Button>
        </div>
      </div>
    </div>
  );
}
