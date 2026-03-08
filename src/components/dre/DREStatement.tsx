import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShoppingBag, Plus, Package, FileText, CreditCard, Truck,
  Megaphone, Building2, ShoppingCart, HelpCircle, ChevronDown, DollarSign,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRE_TOOLTIPS } from "./dreConstants";
import type { DRECalculated, DespesaFixa, DespesaAvulsa, ReceitaAvulsa, DREConfig } from "@/hooks/useDRE";
import { AddDespesaFixaDialog } from "./AddDespesaFixaDialog";
import { AddItemDialog } from "./AddItemDialog";
import { ONETIME_EXPENSE_CATEGORIES, ONETIME_REVENUE_CATEGORIES } from "./dreConstants";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const variationPct = (curr: number, prev: number) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / Math.abs(prev)) * 100;

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
    <div className={cn(
      "flex items-center gap-2 px-4 py-2.5 border-b border-border/30 text-sm transition-colors hover:bg-accent/30",
      indent && "pl-8",
      highlight && "bg-accent/20 font-semibold"
    )}>
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
      {badge && (
        <Badge variant={badge === "auto" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {badge === "auto" ? "Automático" : "Manual"}
        </Badge>
      )}
      {pct && <span className="text-xs text-muted-foreground tabular-nums w-14 text-right shrink-0">{pct}</span>}
      <span className="tabular-nums w-28 text-right shrink-0 font-medium">{fmt(value)}</span>
      {showComparison && (
        <>
          <span className="tabular-nums w-28 text-right shrink-0 text-muted-foreground text-xs">{fmt(prevValue ?? 0)}</span>
          <span className={cn(
            "tabular-nums w-16 text-right shrink-0 text-xs font-medium",
            vari > 0 ? "text-green-500" : vari < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {vari > 0 ? "+" : ""}{fmtPct(vari)}
          </span>
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
          <span className="w-28 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {format(subMonths(selectedMonth, 1), "MMM/yy", { locale: ptBR })}
          </span>
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
    addFixedExpense: any;
    addOnetimeExpense: any;
    addOnetimeRevenue: any;
  };
  showComparison: boolean;
  selectedMonth: Date;
  readOnly?: boolean;
}

export function DREStatement({ dre, showComparison, selectedMonth, readOnly }: Props) {
  const { currentDRE: c, previousDRE: p, config, fixedExpenses, onetimeExpenses, onetimeRevenues } = dre;
  const [showAddFixa, setShowAddFixa] = useState(false);
  const [showAddDespAvulsa, setShowAddDespAvulsa] = useState(false);
  const [showAddRecAvulsa, setShowAddRecAvulsa] = useState(false);

  const rb = c.receitaBruta;
  const pct = (v: number) => (rb > 0 ? fmtPct((v / rb) * 100) : "0.0%");
  const isPositive = c.lucroOperacional >= 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header columns */}
          <SectionHeader label="(+) Receita Bruta" showComparison={showComparison} selectedMonth={selectedMonth} />

          <DRERow icon={ShoppingBag} label="Faturamento (integrações)" value={c.faturamentoIntegracoes}
            prevValue={p.faturamentoIntegracoes} badge="auto" showComparison={showComparison} indent pct={pct(c.faturamentoIntegracoes)} />

          {/* Receitas avulsas expandable */}
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <DRERow icon={Plus} label="Receitas avulsas" value={c.receitasAvulsasTotal}
                prevValue={p.receitasAvulsasTotal} badge="manual" showComparison={showComparison} indent
                pct={pct(c.receitasAvulsasTotal)} tooltip={DRE_TOOLTIPS.receitasAvulsas} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {onetimeRevenues.map((r) => (
                <div key={r.id} className="flex items-center gap-2 pl-12 pr-4 py-1.5 text-xs text-muted-foreground border-b border-border/20">
                  <span className="flex-1 truncate">{r.descricao}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5">{r.categoria}</Badge>
                  <span className="tabular-nums w-28 text-right">{fmt(r.valor)}</span>
                  {showComparison && <span className="w-[calc(28*4px+16*4px)]" />}
                </div>
              ))}
              {!readOnly && (
                <div className="pl-12 pr-4 py-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setShowAddRecAvulsa(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar receita avulsa
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Total Receita Bruta */}
          <DRERow icon={DollarSign} label="Total Receita Bruta" value={c.receitaBruta}
            prevValue={p.receitaBruta} showComparison={showComparison} highlight pct="100%" />

          {/* Deductions */}
          <SectionHeader label="(-) Deduções e Custos" showComparison={showComparison} />

          <DRERow icon={Package} label={`CMV (${config?.cmv_pct || 0}%)`} value={c.cmvValor}
            prevValue={p.cmvValor} badge="manual" showComparison={showComparison} pct={pct(c.cmvValor)} tooltip={DRE_TOOLTIPS.cmv} />

          <DRERow icon={FileText} label={`Impostos (${config?.impostos_pct || 0}%)`} value={c.impostosValor}
            prevValue={p.impostosValor} badge="manual" showComparison={showComparison} pct={pct(c.impostosValor)} tooltip={DRE_TOOLTIPS.impostos} />

          <DRERow icon={CreditCard} label={`Taxas de Plataforma e Gateway (${config?.taxas_plataforma_pct || 0}%)`} value={c.taxasValor}
            prevValue={p.taxasValor} badge="manual" showComparison={showComparison} pct={pct(c.taxasValor)} tooltip={DRE_TOOLTIPS.taxas} />

          <DRERow icon={Truck} label={`Frete Líquido (${config?.frete_liquido_pct || 0}%)`} value={c.freteValor}
            prevValue={p.freteValor} badge="manual" showComparison={showComparison} pct={pct(c.freteValor)} tooltip={DRE_TOOLTIPS.frete} />

          <DRERow icon={Megaphone} label="Investimento em Tráfego Pago" value={c.investimentoTrafego}
            prevValue={p.investimentoTrafego} badge="auto" showComparison={showComparison} pct={pct(c.investimentoTrafego)} />

          {/* Despesas Fixas expandable */}
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <DRERow icon={Building2} label="Despesas Fixas do Mês" value={c.despesasFixasTotal}
                prevValue={p.despesasFixasTotal} badge="manual" showComparison={showComparison} pct={pct(c.despesasFixasTotal)} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {fixedExpenses.filter(d => d.is_active).map((d) => (
                <div key={d.id} className="flex items-center gap-2 pl-12 pr-4 py-1.5 text-xs text-muted-foreground border-b border-border/20">
                  <span className="flex-1 truncate">{d.descricao}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5">{d.categoria}</Badge>
                  <span className="tabular-nums w-28 text-right">{fmt(d.valor)}</span>
                  {showComparison && <span className="w-[calc(28*4px+16*4px)]" />}
                </div>
              ))}
              {!readOnly && (
                <div className="pl-12 pr-4 py-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setShowAddFixa(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar despesa fixa
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Despesas Avulsas expandable */}
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <DRERow icon={ShoppingCart} label="Despesas Avulsas do Mês" value={c.despesasAvulsasTotal}
                prevValue={p.despesasAvulsasTotal} badge="manual" showComparison={showComparison}
                pct={pct(c.despesasAvulsasTotal)} tooltip={DRE_TOOLTIPS.despesasAvulsas} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {onetimeExpenses.map((d) => (
                <div key={d.id} className="flex items-center gap-2 pl-12 pr-4 py-1.5 text-xs text-muted-foreground border-b border-border/20">
                  <span className="flex-1 truncate">{d.descricao}</span>
                  <Badge variant="outline" className="text-[9px] h-3.5">{d.categoria}</Badge>
                  <span className="tabular-nums w-28 text-right">{fmt(d.valor)}</span>
                  {showComparison && <span className="w-[calc(28*4px+16*4px)]" />}
                </div>
              ))}
              {!readOnly && (
                <div className="pl-12 pr-4 py-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setShowAddDespAvulsa(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar despesa avulsa
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Result */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-5 border-t-2",
            isPositive ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30"
          )}>
            <DollarSign className={cn("h-5 w-5 shrink-0", isPositive ? "text-green-500" : "text-red-500")} />
            <span className="flex-1 text-base font-bold">LUCRO OPERACIONAL ESTIMADO</span>
            <Badge variant="outline" className={cn(
              "text-xs px-2 py-0.5",
              isPositive ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"
            )}>
              Margem: {fmtPct(c.margemOperacional)}
            </Badge>
            <span className={cn("text-xl font-bold tabular-nums", isPositive ? "text-green-500" : "text-red-500")}>
              {fmt(c.lucroOperacional)}
            </span>
            {showComparison && (
              <>
                <span className="tabular-nums w-28 text-right text-muted-foreground text-sm">{fmt(p.lucroOperacional)}</span>
                <span className={cn(
                  "tabular-nums w-16 text-right text-xs font-medium",
                  variationPct(c.lucroOperacional, p.lucroOperacional) > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {variationPct(c.lucroOperacional, p.lucroOperacional) > 0 ? "+" : ""}
                  {fmtPct(variationPct(c.lucroOperacional, p.lucroOperacional))}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddDespesaFixaDialog
        open={showAddFixa}
        onOpenChange={setShowAddFixa}
        onAdd={(v) => dre.addFixedExpense.mutate(v)}
      />
      <AddItemDialog
        open={showAddDespAvulsa}
        onOpenChange={setShowAddDespAvulsa}
        title="Adicionar Despesa Avulsa"
        categories={ONETIME_EXPENSE_CATEGORIES}
        onAdd={(v) => dre.addOnetimeExpense.mutate(v)}
      />
      <AddItemDialog
        open={showAddRecAvulsa}
        onOpenChange={setShowAddRecAvulsa}
        title="Adicionar Receita Avulsa"
        categories={ONETIME_REVENUE_CATEGORIES}
        onAdd={(v) => dre.addOnetimeRevenue.mutate(v)}
      />
    </>
  );
}
