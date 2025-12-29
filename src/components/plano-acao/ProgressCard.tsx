import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressCardProps {
  completed: number;
  total: number;
  progress: number;
}

export function ProgressCard({ completed, total, progress }: ProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso do Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {completed} de {total} tarefas concluídas
          </span>
          <span className="text-sm font-semibold text-primary">
            {progress.toFixed(0)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          * Tarefas canceladas não são contabilizadas
        </p>
      </CardContent>
    </Card>
  );
}
