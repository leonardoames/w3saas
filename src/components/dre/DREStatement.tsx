import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShoppingBag, Plus, Package, FileText, CreditCard, Truck,
  Megaphone, Building2, ShoppingCart, HelpCircle, DollarSign, BadgePercent,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRE_TOOLTIPS, DRE_ADJUSTMENT_CATEGORIES } from "./dreConstants";
import type { DRECalculated, DespesaFixa, DespesaAvulsa, ReceitaAvulsa, DREConfig, DREAjusteMensal } from "@/hooks/useDRE";
import { AddItemDialog } from "./AddItemDialog";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const variationPct = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / Math.abs(prev)) * 100);

interface RowProps {
  icon: LucideIcon;
  label: string;
  value: number;
  badge?: "auto" | "manual";
  tooltip?: string;
  pct?: string;
  prevValue?: number;
  showComparison: boolean;
  indent?: boolean;
  highlight?: boolean;
}

function DRERow({ icon: Icon, label, value, badge, tooltip, pct, prevValue, showComparison, indent, highlight }: RowProps) {
  const vari = showComparison && prevValue !== undefined ? variationPct(value, prevValue) : 0;
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-sm transition-colors hover:bg-accent/30", indent && "pl-8", highlight && "bg-accent/20 font-semibold")}>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      )}
      {badge && <Badge variant={badge === "auto" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">{badge === "auto" ? "Automático" : "Manual"}</Badge>}
      {pct && <span className="text-xs text-muted-foreground tabular-nums w-14 text-right shrink-0">{pct}</span>}
      <span className="tabular-nums w-28 text-right shrink-0 font-medium">{fmt(value)}</span>
      {showComparison && (
        <>
          <span className="tabular-nums w-28 text-right shrink-0 text-muted-foreground text-xs">{fmt(prevValue ?? 0)}</span>
          <span className={cn("tabular-nums w-16 text-right shrink-0 text-xs font-medium", vari > 0 ? "text-green-500" : vari < 0 ? "text-red-500" : "text-muted-foreground")}>{vari > 0 ? "+" : ""}{fmtPct(vari)}</span>
        </>
      )}
    </div>
  );
}

function SectionHeader({ label, showComparison, selectedMonth }: { label: string; showComparison: boolean; selectedMonth?: Date }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/30">
      <span className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {showComparison && selectedMonth && (
        <>
          <span className="w-28 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Atual</span>
          <span className="w-28 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{format(subMonths(selectedMonth, 1), "MMM/yy", { locale: ptBR })}</span>
          <span className="w-16 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Var %</span>
        </>
      )}
    </div>
  );
}

interface Props {
  dre: {
    config: DREConfig | null;
    currentDRE: DRECalculated;
    previousDRE: DRECalculated;
    fixedExpenses: DespesaFixa[];
    onetimeExpenses: DespesaAvulsa[];
    onetimeRevenues: ReceitaAvulsa[];
    adjustments: DREAjusteMensal[];
    addAdjustment: any;
    deleteAdjustment: any;
  };
  showComparison: boolean;
  selectedMonth: Date;
  readOnly?: boolean;
}

export function DREStatement({ dre, showComparison, selectedMonth, readOnly }: Props) {
  const { currentDRE: c, previousDRE: p, config, adjustments } = dre;
  const [showAddAjuste, setShowAddAjuste] = useState(false);

  const basePct = c.receitaLiquida > 0 ? c.receitaLiquida : c.receitaBruta;
  const pct = (v: number) => (basePct > 0 ? fmtPct((v / basePct) * 100) : "0.0%");
  const isPositive = c.lucroLiquido >= 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <SectionHeader label="(+) Receita" showComparison={showComparison} selectedMonth={selectedMonth} />
          <DRERow icon={ShoppingBag} label="Receita integrações (pedidos pagos)" value={c.receitaIntegracoes} prevValue={p.receitaIntegracoes} badge="auto" showComparison={showComparison} indent />
          <DRERow icon={Plus} label="Receitas manuais (avulsas + ajustes)" value={c.receitaManual} prevValue={p.receitaManual} badge="manual" showComparison={showComparison} indent tooltip={DRE_TOOLTIPS.receitasAvulsas} />
          <DRERow icon={DollarSign} label="Receita Bruta" value={c.receitaBruta} prevValue={p.receitaBruta} showComparison={showComparison} highlight pct="100%" />

          <SectionHeader label="(-) Deduções de Receita" showComparison={showComparison} />
          <DRERow icon={BadgePercent} label="Descontos" value={c.descontosValor} prevValue={p.descontosValor} badge="manual" showComparison={showComparison} pct={pct(c.descontosValor)} />
          <DRERow icon={ShoppingCart} label="Reembolsos" value={c.reembolsosValor} prevValue={p.reembolsosValor} badge="manual" showComparison={showComparison} pct={pct(c.reembolsosValor)} />
          <DRERow icon={CreditCard} label="Chargebacks" value={c.chargebacksValor} prevValue={p.chargebacksValor} badge="manual" showComparison={showComparison} pct={pct(c.chargebacksValor)} />
          <DRERow icon={DollarSign} label="Receita Líquida" value={c.receitaLiquida} prevValue={p.receitaLiquida} showComparison={showComparison} highlight pct="100%" />

          <SectionHeader label="(-) Custos Variáveis" showComparison={showComparison} />
          <DRERow icon={Package} label={`CMV (${config?.cmv_pct || 0}%)`} value={c.cmvValor} prevValue={p.cmvValor} badge="manual" showComparison={showComparison} pct={pct(c.cmvValor)} tooltip={DRE_TOOLTIPS.cmv} />
          <DRERow icon={FileText} label={`Impostos (${config?.impostos_pct || 0}%)`} value={c.impostosValor} prevValue={p.impostosValor} badge="manual" showComparison={showComparison} pct={pct(c.impostosValor)} tooltip={DRE_TOOLTIPS.impostos} />
          <DRERow icon={CreditCard} label={`Taxas Plataforma/Gateway (${config?.taxas_plataforma_pct || 0}%)`} value={c.taxasValor} prevValue={p.taxasValor} badge="manual" showComparison={showComparison} pct={pct(c.taxasValor)} tooltip={DRE_TOOLTIPS.taxas} />
          <DRERow icon={Truck} label={`Frete Líquido (${config?.frete_liquido_pct || 0}%)`} value={c.freteValor} prevValue={p.freteValor} badge="manual" showComparison={showComparison} pct={pct(c.freteValor)} tooltip={DRE_TOOLTIPS.frete} />
          <DRERow icon={DollarSign} label="Lucro Bruto" value={c.lucroBruto} prevValue={p.lucroBruto} showComparison={showComparison} highlight />

          <SectionHeader label="(-) Despesas Operacionais" showComparison={showComparison} />
          <DRERow icon={Megaphone} label="Investimento em Tráfego" value={c.investimentoTrafego} prevValue={p.investimentoTrafego} badge="auto" showComparison={showComparison} pct={pct(c.investimentoTrafego)} />
          <DRERow icon={Building2} label="Despesas Fixas" value={c.despesasFixasTotal} prevValue={p.despesasFixasTotal} badge="manual" showComparison={showComparison} pct={pct(c.despesasFixasTotal)} />
          <DRERow icon={ShoppingCart} label="Despesas Avulsas" value={c.despesasAvulsasTotal} prevValue={p.despesasAvulsasTotal} badge="manual" showComparison={showComparison} pct={pct(c.despesasAvulsasTotal)} tooltip={DRE_TOOLTIPS.despesasAvulsas} />
          <DRERow icon={FileText} label="Outras Despesas Operacionais (ajustes)" value={c.outrasDespesasOperacionais} prevValue={p.outrasDespesasOperacionais} badge="manual" showComparison={showComparison} pct={pct(c.outrasDespesasOperacionais)} />

          <div className={cn("flex items-center gap-3 px-4 py-5 border-t-2", isPositive ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30")}>
            <DollarSign className={cn("h-5 w-5 shrink-0", isPositive ? "text-green-500" : "text-red-500")} />
            <span className="flex-1 text-base font-bold">LUCRO LÍQUIDO ESTIMADO</span>
            <Badge variant="outline" className={cn("text-xs px-2 py-0.5", isPositive ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500")}>Margem: {fmtPct(c.margemLiquida)}</Badge>
            <span className={cn("text-xl font-bold tabular-nums", isPositive ? "text-green-500" : "text-red-500")}>{fmt(c.lucroLiquido)}</span>
            {showComparison && (
              <>
                <span className="tabular-nums w-28 text-right text-muted-foreground text-sm">{fmt(p.lucroLiquido)}</span>
                <span className={cn("tabular-nums w-16 text-right text-xs font-medium", variationPct(c.lucroLiquido, p.lucroLiquido) > 0 ? "text-green-500" : "text-red-500")}>{variationPct(c.lucroLiquido, p.lucroLiquido) > 0 ? "+" : ""}{fmtPct(variationPct(c.lucroLiquido, p.lucroLiquido))}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <Card><CardContent className="py-3">Ticket Médio: <strong>{fmt(c.ticketMedio)}</strong></CardContent></Card>
        <Card><CardContent className="py-3">ROAS: <strong>{c.roas.toFixed(2)}</strong> · CPA: <strong>{fmt(c.cpa)}</strong></CardContent></Card>
        <Card><CardContent className="py-3">Conversão: <strong>{fmtPct(c.taxaConversao)}</strong> · ROI: <strong>{fmtPct(c.roi)}</strong></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ajustes manuais do mês (DRE)</h3>
            {!readOnly && <Button variant="outline" size="sm" onClick={() => setShowAddAjuste(true)}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar ajuste</Button>}
          </div>
          {adjustments.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-3">Sem ajustes cadastrados para este mês.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {adjustments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs border rounded-md px-3 py-2">
                  <span className="flex-1">{a.descricao}</span>
                  <Badge variant="outline" className="text-[10px]">{a.categoria}</Badge>
                  <span className="tabular-nums">{fmt(a.valor)}</span>
                  {!readOnly && <Button size="sm" variant="ghost" onClick={() => dre.deleteAdjustment.mutate(a.id)} className="h-6 text-destructive">Remover</Button>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemDialog open={showAddAjuste} onOpenChange={setShowAddAjuste} title="Adicionar Ajuste Mensal" categories={DRE_ADJUSTMENT_CATEGORIES} onAdd={(v) => dre.addAdjustment.mutate(v as any)} />
    </>
  );
}
