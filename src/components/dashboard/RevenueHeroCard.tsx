import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Check, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { getDaysInMonth, getDate } from "date-fns";

interface RevenueHeroCardProps {
  currentRevenue: number;
  previousRevenue?: number;
  userId: string;
  onGoalLoaded?: (goal: number | null) => void;
}

export function RevenueHeroCard({ currentRevenue, previousRevenue, userId, onGoalLoaded }: RevenueHeroCardProps) {
  const [goal, setGoal] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("revenue_goal")
        .eq("user_id", userId)
        .single();
      if (data && (data as any).revenue_goal != null) {
        const g = Number((data as any).revenue_goal);
        setGoal(g);
        setInputValue(String(g));
        onGoalLoaded?.(g);
      } else {
        onGoalLoaded?.(null);
      }
      setLoading(false);
    };
    load();
  }, [userId, onGoalLoaded]);

  const handleSave = async () => {
    const value = parseFloat(inputValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Insira um valor válido");
      return;
    }
    const { error } = await supabase
      .from("profiles" as any)
      .update({ revenue_goal: value })
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao salvar meta");
    } else {
      setGoal(value);
      onGoalLoaded?.(value);
      setEditing(false);
      toast.success("Meta atualizada!");
    }
  };

  if (loading) return null;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Projection logic
  const today = new Date();
  const daysPassed = getDate(today);
  const totalDays = getDaysInMonth(today);
  const dailyAvg = daysPassed > 0 ? currentRevenue / daysPassed : 0;
  const projection = dailyAvg * totalDays;

  const hasGoal = goal !== null && goal > 0;
  const percentage = hasGoal ? Math.min((currentRevenue / goal!) * 100, 100) : 0;
  const onTrack = hasGoal && projection >= goal!;
  const gap = hasGoal ? goal! - projection : 0;

  // Expected progress proportional to day of month
  const expectedPct = (daysPassed / totalDays) * 100;
  const getPercentColor = () => {
    if (!hasGoal) return "text-muted-foreground";
    if (percentage >= expectedPct) return "text-success";
    if (percentage >= expectedPct * 0.6) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <Card className="border-primary/15 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:gap-8 gap-6">
          {/* LEFT COLUMN */}
          <div className="md:w-[60%] flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium">
              Faturamento
            </span>
            <p className="text-4xl md:text-[48px] font-bold text-primary leading-tight mt-1">
              {fmt(currentRevenue)}
            </p>
            <span className="text-[13px] text-muted-foreground/50 mt-0.5">Total do período</span>

            {hasGoal && (
              <div className="mt-4 space-y-1">
                <span className="text-[13px] text-muted-foreground">
                  Projeção: <span className="text-foreground font-medium">{fmt(projection)}</span>
                  {" · "}Meta: {fmt(goal!)}
                </span>
                {onTrack ? (
                  <span className="flex items-center gap-1 text-[13px] font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No caminho certo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[13px] font-medium text-yellow-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> Faltam {fmt(Math.abs(gap))} para bater a meta
                  </span>
                )}
              </div>
            )}

            {!hasGoal && !editing && (
              <Button variant="outline" size="sm" className="mt-4 w-fit" onClick={() => setEditing(true)}>
                Definir meta mensal
              </Button>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="md:w-[40%] flex flex-col justify-center">
            {editing ? (
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium">
                  Meta do Mês
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium shrink-0">R$</span>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="max-w-[160px]"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(false); if (goal) setInputValue(String(goal)); }} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : hasGoal ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium">
                    Meta do Mês
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm font-medium">
                  {fmt(currentRevenue)} / {fmt(goal!)}{" "}
                  <span className={`font-semibold ${getPercentColor()}`}>
                    ({percentage.toFixed(0)}%)
                  </span>
                </p>
                <Progress value={percentage} className="h-2" />
                <span className="text-xs text-muted-foreground/60">
                  Projeção: {fmt(projection)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
