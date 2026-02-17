import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Pencil, Check } from "lucide-react";

interface RevenueGoalCardProps {
  currentRevenue: number;
  userId: string;
}

export function RevenueGoalCard({ currentRevenue, userId }: RevenueGoalCardProps) {
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
        setGoal(Number((data as any).revenue_goal));
        setInputValue(String((data as any).revenue_goal));
      }
      setLoading(false);
    };
    load();
  }, [userId]);

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
      setEditing(false);
      toast.success("Meta atualizada!");
    }
  };

  if (loading) return null;

  const percentage = goal && goal > 0 ? Math.min((currentRevenue / goal) * 100, 100) : 0;

  if (goal === null && !editing) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="text-sm">Defina sua meta de faturamento mensal</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Definir meta</Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium shrink-0">Meta mensal: R$</span>
          <Input
            type="number"
            placeholder="100000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-w-[160px]"
          />
          <Button size="icon" variant="ghost" onClick={handleSave}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); if (goal) setInputValue(String(goal)); }}>✕</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Meta de Faturamento</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {currentRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de{" "}
          {goal!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({percentage.toFixed(0)}%)
        </p>
      </CardContent>
    </Card>
  );
}
