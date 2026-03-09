import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Factory, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SkuReposicao, SkuReposicaoForm, computeFields } from "@/hooks/useSkuReposicao";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: SkuReposicao | null;
  onSave: (form: SkuReposicaoForm & { id?: string }) => Promise<void>;
  isSaving: boolean;
}

export function SkuFormDrawer({ open, onOpenChange, item, onSave, isSaving }: Props) {
  const [nome_peca, setNomePeca] = useState("");
  const [sku, setSku] = useState("");
  const [variante, setVariante] = useState("");
  const [tipo_reposicao, setTipoReposicao] = useState<"producao_propria" | "compra_fornecedor">("compra_fornecedor");
  const [estoque_atual, setEstoqueAtual] = useState(0);
  const [vendas_por_dia, setVendasPorDia] = useState(0);
  const [lead_time_medio, setLeadTimeMedio] = useState(0);
  const [lead_time_maximo, setLeadTimeMaximo] = useState(0);
  const [estoque_seguranca, setEstoqueSeguranca] = useState(0);
  const [manualSafety, setManualSafety] = useState(false);
  const [data_ultimo_pedido, setDataUltimoPedido] = useState<Date | undefined>();
  const [observacoes, setObservacoes] = useState("");

  const autoSafety = Math.ceil((lead_time_maximo - lead_time_medio) * vendas_por_dia);

  useEffect(() => {
    if (item) {
      setNomePeca(item.nome_peca);
      setSku(item.sku);
      setVariante(item.variante || "");
      setTipoReposicao(item.tipo_reposicao);
      setEstoqueAtual(item.estoque_atual);
      setVendasPorDia(item.vendas_por_dia);
      setLeadTimeMedio(item.lead_time_medio);
      setLeadTimeMaximo(item.lead_time_maximo);
      setEstoqueSeguranca(item.estoque_seguranca);
      setManualSafety(item.estoque_seguranca !== Math.ceil((item.lead_time_maximo - item.lead_time_medio) * item.vendas_por_dia));
      setDataUltimoPedido(item.data_ultimo_pedido ? new Date(item.data_ultimo_pedido + "T12:00:00") : undefined);
      setObservacoes(item.observacoes || "");
    } else {
      setNomePeca(""); setSku(""); setVariante(""); setTipoReposicao("compra_fornecedor");
      setEstoqueAtual(0); setVendasPorDia(0); setLeadTimeMedio(0); setLeadTimeMaximo(0);
      setEstoqueSeguranca(0); setManualSafety(false); setDataUltimoPedido(undefined); setObservacoes("");
    }
  }, [item, open]);

  useEffect(() => {
    if (!manualSafety) setEstoqueSeguranca(Math.max(0, autoSafety));
  }, [manualSafety, autoSafety]);

  const computed = useMemo(() => computeFields({
    vendas_por_dia, lead_time_medio, estoque_seguranca: manualSafety ? estoque_seguranca : Math.max(0, autoSafety), estoque_atual,
  }), [vendas_por_dia, lead_time_medio, estoque_seguranca, estoque_atual, manualSafety, autoSafety]);

  const handleSave = async () => {
    if (!nome_peca || !sku) return;
    const safeSeg = manualSafety ? estoque_seguranca : Math.max(0, autoSafety);
    await onSave({
      ...(item ? { id: item.id } : {}),
      nome_peca, sku, variante: variante || undefined,
      tipo_reposicao, estoque_atual, vendas_por_dia, lead_time_medio, lead_time_maximo,
      estoque_seguranca: safeSeg,
      data_ultimo_pedido: data_ultimo_pedido ? format(data_ultimo_pedido, "yyyy-MM-dd") : null,
      observacoes: observacoes || undefined,
    });
    onOpenChange(false);
  };

  const canCompute = vendas_por_dia > 0 && lead_time_medio > 0 && estoque_atual > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle>{item ? "Editar Peça" : "Cadastrar Peça"}</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Section 1 - Identificação */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
            <div className="space-y-3">
              <div>
                <Label>Nome da Peça *</Label>
                <Input value={nome_peca} onChange={(e) => setNomePeca(e.target.value)} placeholder="Ex: Camiseta Oversized" />
              </div>
              <div>
                <Label>SKU *</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: CAM-OVS-001" />
                <p className="text-xs text-muted-foreground/50 mt-1">Código único do produto</p>
              </div>
              <div>
                <Label>Variante</Label>
                <Input value={variante} onChange={(e) => setVariante(e.target.value)} placeholder="Ex: P, Azul, 38, Único" />
              </div>
              <div>
                <Label className="mb-2 block">Tipo de Reposição</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoReposicao("producao_propria")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                      tipo_reposicao === "producao_propria"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Factory className="h-4 w-4" /> Produção Própria
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoReposicao("compra_fornecedor")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                      tipo_reposicao === "compra_fornecedor"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Package className="h-4 w-4" /> Fornecedor
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 - Estoque */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estoque Atual</h3>
            <div>
              <Label>Estoque Atual *</Label>
              <div className="relative">
                <Input type="number" min={0} value={estoque_atual || ""} onChange={(e) => setEstoqueAtual(Number(e.target.value))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">unidades</span>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas sobre o produto..." />
            </div>
          </div>

          {/* Section 3 - Velocidade */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Velocidade de Vendas</h3>
            <div>
              <Label>Vendas por Dia *</Label>
              <div className="relative">
                <Input type="number" min={0} step={0.1} value={vendas_por_dia || ""} onChange={(e) => setVendasPorDia(Number(e.target.value))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">unidades/dia</span>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1">Dica: divida as vendas dos últimos 30 dias por 30</p>
            </div>
          </div>

          {/* Section 4 - Lead Time */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tempo de Reposição</h3>
            <div>
              <Label>Tempo médio para chegar/produzir *</Label>
              <div className="relative">
                <Input type="number" min={0} value={lead_time_medio || ""} onChange={(e) => setLeadTimeMedio(Number(e.target.value))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">dias</span>
              </div>
            </div>
            <div>
              <Label>Pior caso já registrado *</Label>
              <div className="relative">
                <Input type="number" min={0} value={lead_time_maximo || ""} onChange={(e) => setLeadTimeMaximo(Number(e.target.value))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">dias</span>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1">O lead time máximo é usado para calcular o estoque de segurança</p>
            </div>
          </div>

          {/* Section 5 - Estoque de Segurança */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estoque de Segurança</h3>
            {!manualSafety ? (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                <p className="text-sm font-semibold text-primary">{Math.max(0, autoSafety)} unidades</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Calculado automaticamente</p>
              </div>
            ) : (
              <div className="relative">
                <Input type="number" min={0} value={estoque_seguranca || ""} onChange={(e) => setEstoqueSeguranca(Number(e.target.value))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">unidades</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={manualSafety} onCheckedChange={setManualSafety} />
              <Label className="text-xs text-muted-foreground">Definir manualmente</Label>
            </div>
            <p className="text-xs text-muted-foreground/50">Unidades extras para cobrir atrasos e picos de demanda</p>
          </div>

          {/* Section 6 - Último Pedido */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Último Pedido</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data_ultimo_pedido && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data_ultimo_pedido ? format(data_ultimo_pedido, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={data_ultimo_pedido} onSelect={setDataUltimoPedido} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground/50">Usado para histórico de reposições</p>
          </div>

          {/* Live Preview */}
          {canCompute && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-base font-bold text-primary">
                📅 Fazer pedido em: {format(computed.data_pedido, "dd/MM/yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                ⚠️ Estoque zera em: {format(computed.data_zeramento, "dd/MM/yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                🔄 Ponto de reposição: {computed.ponto_reposicao} unidades
              </p>
              <p className="text-sm text-muted-foreground">
                🛡️ Estoque de segurança: {manualSafety ? estoque_seguranca : Math.max(0, autoSafety)} unidades
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border/50 bg-background p-4 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isSaving || !nome_peca || !sku}>
            {isSaving ? "Salvando..." : "Salvar Peça"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
