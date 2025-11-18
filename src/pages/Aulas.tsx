import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Play } from "lucide-react";

// Mock data - será substituído por dados reais do banco depois
const modules = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: `Módulo ${i + 1}`,
  description: "Descrição do módulo de aprendizado",
  completed: false,
  videoUrl: "",
}));

export default function Aulas() {
  const completedCount = modules.filter((m) => m.completed).length;
  const progressPercentage = (completedCount / modules.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aulas da Mentoria</h1>
        <p className="mt-2 text-muted-foreground">
          Acesse todo o conteúdo da mentoria e acompanhe seu progresso
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedCount} de {modules.length} módulos concluídos
            </span>
            <span className="text-sm font-semibold text-primary">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((module) => (
          <Card key={module.id} className={module.completed ? "border-success" : ""}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {module.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="default" className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Assistir
              </Button>
              <Button variant="outline" className="flex-1">
                {module.completed ? "Desmarcar" : "Marcar como Concluído"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
