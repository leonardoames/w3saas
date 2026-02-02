import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, ShoppingCart, MousePointerClick } from "lucide-react";
import { PLATFORMS_LIST, getPlatformConfig } from "@/lib/platformConfig";

type MetricType = 'faturamento' | 'roas' | 'vendas' | 'sessoes';

interface MetricData {
  platform: string;
  faturamento: number;
  sessoes: number;
  investimento_trafego: number;
  vendas_quantidade: number;
}

interface PlatformBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: MetricType | null;
  metrics: MetricData[];
}

interface BreakdownItem {
  id: string;
  label: string;
  color: string;
  value: number;
  formattedValue: string;
  subtitle: string;
}

export function PlatformBreakdownModal({ open, onOpenChange, metricType, metrics }: PlatformBreakdownModalProps) {
  if (!metricType) return null;

  const getIcon = () => {
    switch (metricType) {
      case 'faturamento': return <DollarSign className="h-5 w-5" />;
      case 'roas': return <TrendingUp className="h-5 w-5" />;
      case 'vendas': return <ShoppingCart className="h-5 w-5" />;
      case 'sessoes': return <MousePointerClick className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (metricType) {
      case 'faturamento': return 'Faturamento';
      case 'roas': return 'ROAS';
      case 'vendas': return 'Vendas';
      case 'sessoes': return 'Sessões';
    }
  };

  const getBreakdown = (): BreakdownItem[] => {
    const breakdown: Record<string, { faturamento: number; investimento: number; vendas: number; sessoes: number }> = {};

    PLATFORMS_LIST.forEach(p => {
      breakdown[p.id] = { faturamento: 0, investimento: 0, vendas: 0, sessoes: 0 };
    });

    metrics.forEach(m => {
      const p = m.platform || 'outros';
      if (!breakdown[p]) breakdown[p] = { faturamento: 0, investimento: 0, vendas: 0, sessoes: 0 };
      
      breakdown[p].faturamento += Number(m.faturamento) || 0;
      breakdown[p].investimento += Number(m.investimento_trafego) || 0;
      breakdown[p].vendas += Number(m.vendas_quantidade) || 0;
      breakdown[p].sessoes += Number(m.sessoes) || 0;
    });

    return PLATFORMS_LIST.map(p => {
      const stats = breakdown[p.id];
      let value = 0;
      let formattedValue = "";
      let subtitle = "";

      if (metricType === 'faturamento') {
        value = stats.faturamento;
        formattedValue = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        subtitle = `${stats.vendas} vendas`;
      } else if (metricType === 'roas') {
        value = stats.investimento > 0 ? stats.faturamento / stats.investimento : 0;
        formattedValue = value.toFixed(2);
        subtitle = `Inv: R$ ${stats.investimento.toLocaleString("pt-BR")}`;
      } else if (metricType === 'vendas') {
        value = stats.vendas;
        formattedValue = value.toLocaleString("pt-BR");
        subtitle = stats.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      } else if (metricType === 'sessoes') {
        value = stats.sessoes;
        formattedValue = value.toLocaleString("pt-BR");
        const conv = stats.sessoes > 0 ? ((stats.vendas / stats.sessoes) * 100).toFixed(2) : "0";
        subtitle = `Conv: ${conv}%`;
      }

      return { 
        id: p.id, 
        label: p.label, 
        color: p.color, 
        value, 
        formattedValue, 
        subtitle 
      };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  };

  const breakdownData = getBreakdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {getIcon()}
            {getTitle()} por Plataforma
          </DialogTitle>
          <DialogDescription>
            Performance detalhada no período selecionado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {breakdownData.length > 0 ? (
            breakdownData.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">{item.formattedValue}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado para este período.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
