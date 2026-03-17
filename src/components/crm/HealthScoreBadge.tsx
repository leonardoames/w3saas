import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface HealthScoreInfo {
  score: number;
  color: string;       // Tailwind bg color
  textColor: string;   // Tailwind text color
  borderColor: string; // Tailwind border-l color for card
  label: string;
}

export function getHealthScoreInfo(score: number): HealthScoreInfo {
  if (score >= 80) return { score, color: "bg-green-500",  textColor: "text-green-700 dark:text-green-400",  borderColor: "border-l-green-500",  label: "Saudável" };
  if (score >= 60) return { score, color: "bg-blue-500",   textColor: "text-blue-700 dark:text-blue-400",    borderColor: "border-l-blue-500",   label: "Estável" };
  if (score >= 40) return { score, color: "bg-amber-500",  textColor: "text-amber-700 dark:text-amber-400",  borderColor: "border-l-amber-500",  label: "Atenção" };
  if (score >= 20) return { score, color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400",borderColor: "border-l-orange-500", label: "Risco" };
  return              { score, color: "bg-red-600",    textColor: "text-red-700 dark:text-red-400",      borderColor: "border-l-red-600",    label: "Crítico" };
}

/**
 * Compute health score 0–100 from available card data.
 * lastLoginDaysAgo: days since last login (null = unknown)
 * completedTasks / totalTasks: plan completion
 * sparkline: last 4 audit faturamento values (oldest→newest)
 * stage: crm stage string
 */
export function computeHealthScore({
  lastLoginDaysAgo,
  completedTasks,
  totalTasks,
  sparkline,
  stage,
}: {
  lastLoginDaysAgo: number | null;
  completedTasks: number;
  totalTasks: number;
  sparkline: (number | null)[];
  stage: string;
}): number {
  // Login recente (0–25)
  let loginScore = 0;
  if (lastLoginDaysAgo !== null) {
    if (lastLoginDaysAgo <= 7) loginScore = 25;
    else if (lastLoginDaysAgo <= 14) loginScore = 15;
    else if (lastLoginDaysAgo <= 30) loginScore = 5;
    else loginScore = 0;
  }

  // Conclusão do plano (0–25)
  let planScore = 12; // default sem tarefas
  if (totalTasks > 0) {
    planScore = Math.round((completedTasks / totalTasks) * 25);
  }

  // Tendência de receita (0–25) — sparkline: oldest…newest
  let revenueScore = 5;
  const validSparkline = sparkline.filter(v => v !== null && v !== undefined) as number[];
  if (validSparkline.length >= 2) {
    const first = validSparkline[0];
    const last = validSparkline[validSparkline.length - 1];
    if (first > 0) {
      const change = (last - first) / first;
      if (change > 0.05) revenueScore = 25;
      else if (change >= -0.05) revenueScore = 10;
      else revenueScore = 0;
    }
  } else if (validSparkline.length === 0) {
    revenueScore = 0;
  }

  // Stage (0–25)
  const stageScores: Record<string, number> = {
    engajado: 25,
    onboarding: 20,
    risco: 10,
    alerta: 5,
    congelado: 0,
    cancelado: 0,
    reembolsado: 0,
    concluido: 25,
  };
  const stageScore = stageScores[stage] ?? 0;

  return Math.min(100, loginScore + planScore + revenueScore + stageScore);
}

interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function HealthScoreBadge({ score, size = "md" }: HealthScoreBadgeProps) {
  const info = getHealthScoreInfo(score);
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${dim} rounded-full ${info.color} text-white font-bold flex items-center justify-center shrink-0 cursor-default select-none shadow-sm`}
          >
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">Health Score: {score}/100</p>
          <p className="text-muted-foreground">{info.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
