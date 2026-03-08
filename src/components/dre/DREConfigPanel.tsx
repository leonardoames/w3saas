import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Plus, HelpCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { useDRE } from "@/hooks/useDRE";
import { AddDespesaFixaDialog } from "./AddDespesaFixaDialog";
import { AddItemDialog } from "./AddItemDialog";
import { DRE_TOOLTIPS, ONETIME_EXPENSE_CATEGORIES, ONETIME_REVENUE_CATEGORIES } from "./dreConstants";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

interface Props {
  dre: ReturnType<typeof useDRE>;
  readOnly: boolean;
}

export function DREConfigPanel({ dre, readOnly }: Props) {
  const { config, fixedExpenses, onetimeExpenses, onetimeRevenues } = dre;

  // Percentage fields
  const [cmv, setCmv] = useState(String(config?.cmv_pct ?? 0));
  const [impostos, setImpostos] = useState(String(config?.impostos_pct ?? 0));
  const [taxas, setTaxas] = useState(String(config?.taxas_plataforma_pct ?? 0));
  const [frete, setFrete] = useState(String(config?.frete_liquido_pct ?? 0));

  // Sync state when config loads
  const [lastConfigId, setLastConfigId] = useState<string | null>(null);
  if (config && config.id !== lastConfigId) {
    setCmv(String(config.cmv_pct));
    setImpostos(String(config.impostos_pct));
    setTaxas(String(config.taxas_plataforma_pct));
    setFrete(String(config.frete_liquido_pct));
    setLastConfigId(config.id);
  }

  const [editingFixaId, setEditingFixaId] = useState<string | null>(null);
  const [editingFixaValue, setEditingFixaValue] = useState("");
  const [showAddFixa, setShowAddFixa] = useState(false);
  const [showAddDespAvulsa, setShowAddDespAvulsa] = useState(false);
  const [showAddRecAvulsa, setShowAddRecAvulsa] = useState(false);

  const handleSavePct = (field: string, value: string) => {
    const num = parseFloat(value) || 0;
    dre.upsertConfig.mutate(
      { [field]: num } as any,
      { onSuccess: () => toast.success("Percentual salvo") }
    );
  };

  const pctFields = [
    { key: "cmv_pct", label: "CMV %", value: cmv, setter: setCmv, tooltip: DRE_TOOLTIPS.cmv },
    { key: "impostos_pct", label: "Impostos %", value: impostos, setter: setImpostos, tooltip: DRE_TOOLTIPS.impostos },
    { key: "taxas_plataforma_pct", label: "Taxas de Plataforma %", value: taxas, setter: setTaxas, tooltip: DRE_TOOLTIPS.taxas },
    { key: "frete_liquido_pct", label: "Frete Líquido %", value: frete, setter: setFrete, tooltip: DRE_TOOLTIPS.frete },
  ];

  const fixasTotal = fixedExpenses.filter((d) => d.is_active).reduce((s, d) => s + Number(d.valor), 0);

  return (
    <div className="space-y-6">
      {/* Percentuais Variáveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Percentuais Variáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pctFields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{f.tooltip}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    onBlur={() => handleSavePct(f.key, f.value)}
                    disabled={readOnly}
                    className="pr-6 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Despesas Fixas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Despesas Fixas Mensais</CardTitle>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowAddFixa(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {fixedExpenses.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma despesa fixa cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-16 text-center">Ativo</TableHead>
                  {!readOnly && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedExpenses.map((d) => (
                  <TableRow key={d.id} className={cn(!d.is_active && "opacity-50")}>
                    <TableCell className="text-sm">{d.descricao}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.categoria}</Badge></TableCell>
                    <TableCell className="text-right">
                      {editingFixaId === d.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28 ml-auto text-right text-sm h-8"
                          value={editingFixaValue}
                          onChange={(e) => setEditingFixaValue(e.target.value)}
                          onBlur={() => {
                            dre.updateFixedExpense.mutate({ id: d.id, valor: parseFloat(editingFixaValue) || 0 });
                            setEditingFixaId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              dre.updateFixedExpense.mutate({ id: d.id, valor: parseFloat(editingFixaValue) || 0 });
                              setEditingFixaId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          className="text-sm tabular-nums hover:text-primary transition-colors cursor-pointer"
                          onClick={() => { if (!readOnly) { setEditingFixaId(d.id); setEditingFixaValue(String(d.valor)); } }}
                        >
                          {fmt(d.valor)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={d.is_active}
                        onCheckedChange={(checked) => dre.updateFixedExpense.mutate({ id: d.id, is_active: checked })}
                        disabled={readOnly}
                      />
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => dre.deleteFixedExpense.mutate(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {fixedExpenses.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground">Total despesas fixas ativas</span>
              <span className="text-sm font-semibold tabular-nums">{fmt(fixasTotal)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Despesas Avulsas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Despesas Avulsas do Mês</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{DRE_TOOLTIPS.despesasAvulsas}</TooltipContent>
            </Tooltip>
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDespAvulsa(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {onetimeExpenses.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma despesa avulsa neste mês</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {!readOnly && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {onetimeExpenses.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.descricao}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.categoria}</Badge></TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmt(d.valor)}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => dre.deleteOnetimeExpense.mutate(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receitas Avulsas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Receitas Avulsas do Mês</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{DRE_TOOLTIPS.receitasAvulsas}</TooltipContent>
            </Tooltip>
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowAddRecAvulsa(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {onetimeRevenues.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma receita avulsa neste mês</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {!readOnly && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {onetimeRevenues.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.descricao}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.categoria}</Badge></TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmt(r.valor)}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => dre.deleteOnetimeRevenue.mutate(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddDespesaFixaDialog open={showAddFixa} onOpenChange={setShowAddFixa}
        onAdd={(v) => dre.addFixedExpense.mutate(v, { onSuccess: () => toast.success("Despesa fixa adicionada") })} />
      <AddItemDialog open={showAddDespAvulsa} onOpenChange={setShowAddDespAvulsa}
        title="Adicionar Despesa Avulsa" categories={ONETIME_EXPENSE_CATEGORIES}
        onAdd={(v) => dre.addOnetimeExpense.mutate(v, { onSuccess: () => toast.success("Despesa avulsa adicionada") })} />
      <AddItemDialog open={showAddRecAvulsa} onOpenChange={setShowAddRecAvulsa}
        title="Adicionar Receita Avulsa" categories={ONETIME_REVENUE_CATEGORIES}
        onAdd={(v) => dre.addOnetimeRevenue.mutate(v, { onSuccess: () => toast.success("Receita avulsa adicionada") })} />
    </div>
  );
}
