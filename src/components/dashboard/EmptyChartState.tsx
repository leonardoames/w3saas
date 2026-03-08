import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function EmptyChartState() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card p-5 md:p-6" style={{ borderColor: 'hsla(24, 94%, 53%, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-3">
        <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-foreground/70">Nenhum dado encontrado para este período</p>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/app/acompanhamento")}>
          Adicionar dados
        </Button>
      </div>
    </div>
  );
}
