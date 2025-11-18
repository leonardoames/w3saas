import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, AlertCircle } from "lucide-react";

// Mock data - será substituído por dados reais do banco depois
const tasks = [
  {
    id: 1,
    title: "Configurar Google Analytics",
    description: "Instalar o código de rastreamento no site e configurar as metas principais",
    priority: "high",
    dueDate: "2025-01-20",
    status: "todo",
  },
  {
    id: 2,
    title: "Revisar copy das páginas de produto",
    description: "Melhorar descrições e títulos focando em benefícios e SEO",
    priority: "medium",
    dueDate: "2025-01-22",
    status: "todo",
  },
  {
    id: 3,
    title: "Criar campanhas de remarketing",
    description: "Configurar audiências no Meta Ads para visitantes que não compraram",
    priority: "high",
    dueDate: "2025-01-18",
    status: "in_progress",
  },
];

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground",
  high: "bg-destructive/20 text-destructive",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default function PlanoAcao() {
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const progressPercentage = (completedTasks / tasks.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plano de Ação</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe as tarefas definidas pelo seu tutor e mantenha tudo organizado
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {completedTasks} de {tasks.length} tarefas concluídas
            </span>
            <span className="text-sm font-semibold text-primary">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.status === "completed"}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`task-${task.id}`}
                      className="cursor-pointer text-lg font-semibold"
                    >
                      {task.title}
                    </label>
                    <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                      {priorityLabels[task.priority as keyof typeof priorityLabels]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data limite: {new Date(task.dueDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Empty state se não houver tarefas */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma tarefa cadastrada ainda
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu tutor adicionará tarefas personalizadas para você em breve
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
