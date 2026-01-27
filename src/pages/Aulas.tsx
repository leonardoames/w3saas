import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Play, Plus, Lock } from "lucide-react";
import { useState } from "react";

// Tipo para as aulas
interface Lesson {
  id: string;
  title: string;
  description: string;
  pandaVideoId: string; // ID do vídeo no Panda Video
  duration: string; // Ex: "15:30"
  completed: boolean;
}

// Tipo para os módulos
interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

// Mock data - será substituído por dados reais do banco depois
const modulesData: Module[] = [
  {
    id: "1",
    title: "Módulo 1",
    description: "Descrição do módulo de aprendizado",
    lessons: [
      {
        id: "1-1",
        title: "Aula 1: Introdução",
        description: "Primeira aula do módulo",
        pandaVideoId: "seu-video-id-panda",
        duration: "10:30",
        completed: false,
      },
      {
        id: "1-2",
        title: "Aula 2: Fundamentos",
        description: "Segunda aula do módulo",
        pandaVideoId: "seu-video-id-panda-2",
        duration: "15:45",
        completed: false,
      },
    ],
  },
  {
    id: "2",
    title: "Módulo 2",
    description: "Descrição do módulo de aprendizado",
    lessons: [
      {
        id: "2-1",
        title: "Aula 1: Conceitos Avançados",
        description: "Primeira aula do módulo 2",
        pandaVideoId: "seu-video-id-panda-3",
        duration: "20:15",
        completed: false,
      },
    ],
  },
];

interface AulasProps {
  isAdmin?: boolean; // Prop para definir se é administrador
}

export default function Aulas({ isAdmin = false }: AulasProps) {
  const [modules, setModules] = useState<Module[]>(modulesData);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Calcula o progresso total
  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessons = modules.reduce((sum, module) => sum + module.lessons.filter((l) => l.completed).length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Função para marcar aula como concluída
  const toggleLessonComplete = (moduleId: string, lessonId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson,
              ),
            }
          : module,
      ),
    );
  };

  // Função para adicionar nova aula (apenas admin)
  const handleAddLesson = (moduleId: string) => {
    if (!isAdmin) return;

    // Aqui você abriria um modal ou formulário para adicionar a aula
    console.log("Adicionar aula ao módulo:", moduleId);
    // Implementar modal com formulário para adicionar:
    // - Título da aula
    // - Descrição
    // - ID do vídeo do Panda Video
    // - Duração
  };

  // Função para assistir aula
  const watchLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    // Aqui você pode abrir um modal com o player do Panda Video
    // ou redirecionar para uma página de player
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aulas da Mentoria</h1>
        <p className="mt-2 text-muted-foreground">Acesse todo o conteúdo da mentoria e acompanhe seu progresso</p>
      </div>

      {/* Progress Card */}
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

      {/* Modules Accordion */}
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
                    <span className="text-sm text-muted-foreground">
                      {moduleCompletedCount}/{module.lessons.length}
                    </span>
                    <Progress value={moduleProgress} className="w-20 h-2" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-4">
                <div className="space-y-3">
                  {/* Lista de Aulas */}
                  {module.lessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className={`${lesson.completed ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {lesson.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold">{lesson.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                              <span className="text-xs text-muted-foreground mt-2 inline-block">
                                Duração: {lesson.duration}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" onClick={() => watchLesson(lesson)} className="whitespace-nowrap">
                              <Play className="mr-2 h-4 w-4" />
                              Assistir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleLessonComplete(module.id, lesson.id)}
                              className="whitespace-nowrap"
                            >
                              {lesson.completed ? "Desmarcar" : "Concluir"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Botão Adicionar Aula (apenas admin) */}
                  {isAdmin && (
                    <Button variant="outline" className="w-full mt-2" onClick={() => handleAddLesson(module.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Nova Aula
                    </Button>
                  )}

                  {/* Mensagem quando não há aulas */}
                  {module.lessons.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma aula disponível neste módulo ainda</p>
                      {isAdmin && <p className="text-sm mt-1">Clique em "Adicionar Nova Aula" para começar</p>}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Modal/Player do Panda Video (renderiza quando uma aula é selecionada) */}
      {selectedLesson && (
        <VideoPlayerModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onComplete={() =>
            toggleLessonComplete(
              modules.find((m) => m.lessons.some((l) => l.id === selectedLesson.id))?.id || "",
              selectedLesson.id,
            )
          }
        />
      )}
    </div>
  );
}

// Componente Modal para o Player do Panda Video
interface VideoPlayerModalProps {
  lesson: Lesson;
  onClose: () => void;
  onComplete: () => void;
}

function VideoPlayerModal({ lesson, onClose, onComplete }: VideoPlayerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{lesson.title}</h2>
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="aspect-video bg-black">
          {/* Embed do Panda Video */}
          <iframe
            src={`https://player-vz-########.tv.pandavideo.com.br/embed/?v=${lesson.pandaVideoId}`}
            style={{ border: "none", width: "100%", height: "100%" }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Duração: {lesson.duration}</span>
          <Button onClick={onComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como Concluída
          </Button>
        </div>
      </div>
    </div>
  );
}
