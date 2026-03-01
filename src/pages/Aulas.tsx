import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Play, Plus, Lock, Loader2, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { AddLessonModal } from "@/components/AddLessonModal";
import { AddModuleModal } from "@/components/aulas/AddModuleModal";
import { EditModuleModal } from "@/components/aulas/EditModuleModal";
import { EditLessonModal } from "@/components/aulas/EditLessonModal";
import { ConfirmDeleteDialog } from "@/components/aulas/ConfirmDeleteDialog";
import { ModuleCard, ModuleCardSkeleton } from "@/components/aulas/ModuleCard";
import { Card, CardContent } from "@/components/ui/card";

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
  cover_url?: string | null;
  lessons: Lesson[];
}

const PANDA_EMBED_BASE = "https://player-vz-75e71015-90c.tv.pandavideo.com.br/embed/?v=";

function normalizePandaEmbed(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("<")) {
    const match = raw.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const extracted = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
    if (extracted) return extracted;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const videoId = (uuidMatch?.[0] ?? raw).trim();
  return `${PANDA_EMBED_BASE}${encodeURIComponent(videoId)}`;
}

export default function Aulas() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .order("order");
      if (modulesError) throw modulesError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons").select("*").order("order");
      if (lessonsError) throw lessonsError;

      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress").select("*").eq("user_id", user.id);
      if (progressError) throw progressError;

      const modulesWithLessons: Module[] = (modulesData as any[]).map((module) => ({
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
      toast({ title: "Erro", description: "Não foi possível carregar as aulas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonComplete = async (moduleId: string, lessonId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      if (!lesson) return;

      if (lesson.completed) {
        await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      } else {
        await supabase.from("lesson_progress").insert({ user_id: user.id, lesson_id: lessonId, completed: true });
      }

      setModules((prev) =>
        prev.map((module) =>
          module.id === moduleId
            ? { ...module, lessons: module.lessons.map((l) => (l.id === lessonId ? { ...l, completed: !l.completed } : l)) }
            : module
        )
      );

      toast({
        title: lesson.completed ? "Aula desmarcada" : "🎉 Aula concluída!",
        description: lesson.completed ? "Aula desmarcada como concluída" : "Parabéns! Continue assim.",
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o progresso.", variant: "destructive" });
    }
  };

  const handleAddLesson = (moduleId: string, moduleTitle: string) => {
    setSelectedModuleId(moduleId);
    setSelectedModuleTitle(moduleTitle);
    setIsAddLessonModalOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setModuleToEdit(module);
    setIsEditModuleModalOpen(true);
  };

  const handleDeleteModule = (module: Module) => {
    setModuleToDelete(module);
    setIsDeleteModuleDialogOpen(true);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const deletingModuleId = moduleToDelete.id;
    setIsDeletingModule(true);
    try {
      const { error: lessonsError } = await supabase.from("lessons").delete().eq("module_id", deletingModuleId);
      if (lessonsError) throw lessonsError;
      const { error: moduleError } = await supabase.from("course_modules").delete().eq("id", deletingModuleId);
      if (moduleError) throw moduleError;
      setModules((prev) => prev.filter((m) => m.id !== deletingModuleId));
      toast({ title: "✅ Módulo excluído!", description: "O módulo e suas aulas foram removidos com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir módulo:", error);
      toast({ title: "❌ Erro", description: "Não foi possível excluir o módulo.", variant: "destructive" });
      fetchModulesAndLessons();
    } finally {
      setIsDeletingModule(false);
      setIsDeleteModuleDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  const handleEditLesson = (lesson: Lesson) => { setLessonToEdit(lesson); setIsEditLessonModalOpen(true); };
  const handleDeleteLesson = (lesson: Lesson) => { setLessonToDelete(lesson); setIsDeleteLessonDialogOpen(true); };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    setIsDeletingLesson(true);
    try {
      const { error: progressError } = await supabase.from("lesson_progress").delete().eq("lesson_id", lessonToDelete.id);
      if (progressError) throw progressError;
      const { error: lessonError } = await supabase.from("lessons").delete().eq("id", lessonToDelete.id);
      if (lessonError) throw lessonError;
      toast({ title: "✅ Aula excluída!", description: "A aula foi removida com sucesso." });
      fetchModulesAndLessons();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      toast({ title: "❌ Erro", description: "Não foi possível excluir a aula.", variant: "destructive" });
    } finally {
      setIsDeletingLesson(false);
      setIsDeleteLessonDialogOpen(false);
      setLessonToDelete(null);
    }
  };

  const watchLesson = (lesson: Lesson) => setSelectedLesson(lesson);

  // --- Computed values ---
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.completed).length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find "continue where you left off" — first incomplete lesson
  const continueLesson = (() => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.completed) return { module: mod, lesson };
      }
    }
    return null;
  })();

  const expandedModule = modules.find((m) => m.id === expandedModuleId);

  if (loading || adminLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        {/* Skeleton header */}
        <div className="space-y-3">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Aulas da Mentoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedLessons} de {totalLessons} aulas concluídas
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddModuleModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Módulo
          </Button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progresso Geral</span>
          <span className="text-sm font-semibold text-primary">{progressPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Continue where you left off */}
      {continueLesson && !expandedModuleId && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="hidden sm:block relative overflow-hidden rounded-lg flex-shrink-0 w-16" style={{ aspectRatio: "708/1494" }}>
              <img
                src={continueLesson.module.cover_url || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=420&fit=crop&auto=format&q=60"}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Continue de onde você parou</p>
              <p className="font-semibold truncate">{continueLesson.lesson.title}</p>
              <p className="text-xs text-muted-foreground truncate">{continueLesson.module.title}</p>
            </div>
            <Button size="sm" onClick={() => watchLesson(continueLesson.lesson)} className="flex-shrink-0">
              <Play className="mr-2 h-4 w-4" />
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum módulo disponível</p>
            {isAdmin && <p className="text-sm mt-2">Clique em "Novo Módulo" para começar a criar o curso.</p>}
          </CardContent>
        </Card>
      )}

      {/* Expanded Module — lesson list */}
      {expandedModule && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setExpandedModuleId(null)}>
              ← Voltar
            </Button>
            <div>
              <h2 className="text-xl font-bold">{expandedModule.title}</h2>
              {expandedModule.description && (
                <p className="text-sm text-muted-foreground">{expandedModule.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {expandedModule.lessons.map((lesson) => (
              <Card
                key={lesson.id}
                className={lesson.completed ? "border-success/50 bg-success/5" : ""}
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
                        <span className="text-xs text-muted-foreground mt-2 inline-block">⏱️ {lesson.duration}</span>
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
                        onClick={() => toggleLessonComplete(expandedModule.id, lesson.id)}
                        className="flex-1 sm:flex-none"
                      >
                        {lesson.completed ? "Desmarcar" : "Concluir"}
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditLesson(lesson)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteLesson(lesson)}
                          >
                            <Trash2 className="h-4 w-4" />
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
                onClick={() => handleAddLesson(expandedModule.id, expandedModule.title)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Nova Aula
              </Button>
            )}

            {expandedModule.lessons.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma aula disponível ainda</p>
                {isAdmin && <p className="text-sm mt-1">Clique em "Adicionar Nova Aula" para começar</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Grid — Netflix style (hidden when a module is expanded) */}
      {!expandedModuleId && modules.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {modules.map((module) => {
            const completedCount = module.lessons.filter((l) => l.completed).length;
            return (
              <ModuleCard
                key={module.id}
                id={module.id}
                title={module.title}
                coverUrl={module.cover_url}
                completedCount={completedCount}
                totalLessons={module.lessons.length}
                isAdmin={isAdmin}
                onClick={() => setExpandedModuleId(module.id)}
                onEdit={() => handleEditModule(module)}
                onDelete={() => handleDeleteModule(module)}
              />
            );
          })}
        </div>
      )}

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
            description={`Tem certeza que deseja excluir o módulo "${moduleToDelete?.title}"? Todas as aulas dentro dele também serão excluídas.`}
            isDeleting={isDeletingModule}
          />
          <ConfirmDeleteDialog
            isOpen={isDeleteLessonDialogOpen}
            onClose={() => setIsDeleteLessonDialogOpen(false)}
            onConfirm={confirmDeleteLesson}
            title="Excluir Aula"
            description={`Tem certeza que deseja excluir a aula "${lessonToDelete?.title}"?`}
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
            if (module) toggleLessonComplete(module.id, selectedLesson.id);
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
          <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como Concluída
          </Button>
        </div>
      </div>
    </div>
  );
}
