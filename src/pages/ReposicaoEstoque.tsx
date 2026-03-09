import { useState, useMemo } from "react";
import { Plus, PackageSearch, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSkuReposicao, SkuReposicao, SkuReposicaoForm, computeFields, ComputedFields } from "@/hooks/useSkuReposicao";
import { SkuFormDrawer } from "@/components/reposicao/SkuFormDrawer";
import { SkuDetailPanel } from "@/components/reposicao/SkuDetailPanel";
import { format } from "date-fns";

type StatusFilter = "all" | "critico" | "atencao" | "seguro";
type TipoFilter = "all" | "producao_propria" | "compra_fornecedor";

function getStatusLabel(status: ComputedFields["status"]) {
  switch (status) {
    case "critico": return { label: "🔴 Pedir Agora", cls: "bg-red-500/20 text-red-400 border-red-500/30" };
    case "atencao": return { label: "🟡 Atenção", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
    case "seguro": return { label: "🟢 Em Dia", cls: "bg-green-500/20 text-green-400 border-green-500/30" };
  }
}

function getDateLabel(dataPedido: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((dataPedido.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "ATRASADO", color: "#EF4444" };
  if (diff === 0) return { text: "HOJE", color: "#EF4444" };
  if (diff <= 7) return { text: format(dataPedido, "dd/MM"), color: "#F97316" };
  return { text: format(dataPedido, "dd/MM"), color: "rgba(255,255,255,0.7)" };
}

function getDiasColor(dias: number) {
  if (dias <= 0) return "#EF4444";
  if (dias <= 7) return "#F97316";
  return "#22C55E";
}

export default function ReposicaoEstoque() {
  const { items, isLoading, create, update, remove, quickUpdateStock, registerOrder, isCreating, isUpdating } = useSkuReposicao();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<SkuReposicao | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all");

  const enriched = useMemo(() => {
    return items.map((item) => ({ ...item, computed: computeFields(item) }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (statusFilter !== "all") list = list.filter((i) => i.computed.status === statusFilter);
    if (tipoFilter !== "all") list = list.filter((i) => i.tipo_reposicao === tipoFilter);
    return list.sort((a, b) => a.computed.data_pedido.getTime() - b.computed.data_pedido.getTime());
  }, [enriched, statusFilter, tipoFilter]);

  const counts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total: enriched.length,
      critico: enriched.filter((i) => i.computed.status === "critico").length,
      atencao: enriched.filter((i) => i.computed.status === "atencao").length,
      seguro: enriched.filter((i) => i.computed.status === "seguro").length,
    };
  }, [enriched]);

  const handleSave = async (form: SkuReposicaoForm & { id?: string }) => {
    if (form.id) await update(form as any);
    else await create(form);
  };

  const openCreate = () => { setEditItem(null); setDrawerOpen(true); };
  const openEdit = (item: SkuReposicao) => { setEditItem(item); setDrawerOpen(true); };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted/30 animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reposição de Estoque</h1>
          <p className="text-sm text-muted-foreground/60">Gestão de ponto de reposição por SKU</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Cadastrar Peça
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Peças Cadastradas</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </Card>
        <Card className={`p-4 ${counts.critico > 0 ? "border-red-500/30" : ""}`}>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Pedir Hoje</p>
          <p className="text-2xl font-bold mt-1" style={{ color: counts.critico > 0 ? "#EF4444" : undefined }}>{counts.critico}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Próximos 7 dias</p>
          <p className="text-2xl font-bold mt-1 text-orange-400">{counts.atencao}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Em dia</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{counts.seguro}</p>
        </Card>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full p-6 mb-4" style={{ backgroundColor: "rgba(249,115,22,0.1)" }}>
            <PackageSearch className="h-12 w-12" style={{ color: "rgba(249,115,22,0.5)" }} />
          </div>
          <h2 className="text-lg font-semibold mb-1">Nenhuma peça cadastrada</h2>
          <p className="text-sm text-muted-foreground/60 max-w-md mb-6">
            Cadastre suas peças para calcular automaticamente quando fazer cada pedido de reposição
          </p>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Cadastrar primeira peça
          </Button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="critico">🔴 Crítico</SelectItem>
                <SelectItem value="atencao">🟡 Atenção</SelectItem>
                <SelectItem value="seguro">🟢 Em Dia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="producao_propria">Produção Própria</SelectItem>
                <SelectItem value="compra_fornecedor">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Peça / Variante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Venda/dia</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead className="text-right">Pt. Reposição</TableHead>
                  <TableHead className="text-right">📅 PEDIR EM</TableHead>
                  <TableHead className="text-right">Dias rest.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const { computed } = item;
                  const dateLabel = getDateLabel(computed.data_pedido);
                  const statusInfo = getStatusLabel(computed.status);
                  const diasColor = getDiasColor(computed.dias_restantes);
                  const isOpen = expandedId === item.id;
                  const maxDays = 30;
                  const progressPct = Math.min(100, (computed.dias_restantes / maxDays) * 100);

                  return (
                    <> 
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => setExpandedId(isOpen ? null : item.id)}>
                        <TableCell className="w-8 px-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>
                          <span className="font-medium">{item.nome_peca}</span>
                          {item.variante && <span className="text-muted-foreground/50 ml-1.5 text-xs">({item.variante})</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.tipo_reposicao === "producao_propria" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-purple-500/10 text-purple-400 border-purple-500/30"}>
                            {item.tipo_reposicao === "producao_propria" ? "Produção" : "Fornecedor"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.estoque_atual}</TableCell>
                        <TableCell className="text-right">{item.vendas_por_dia}</TableCell>
                        <TableCell className="text-right">{item.lead_time_medio}d</TableCell>
                        <TableCell className="text-right">{computed.ponto_reposicao}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-bold" style={{ color: dateLabel.color }}>{dateLabel.text}</span>
                            </TooltipTrigger>
                            <TooltipContent>Faça o pedido nesta data para receber antes de zerar o estoque</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-medium" style={{ color: diasColor }}>{Math.max(0, Math.floor(computed.dias_restantes))} dias</span>
                            <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: diasColor }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.cls}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover peça?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita. A peça "{item.nome_peca}" será removida permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(item.id)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${item.id}-detail`}>
                          <TableCell colSpan={12} className="p-0">
                            <SkuDetailPanel item={item} onRegisterOrder={registerOrder} onQuickUpdateStock={quickUpdateStock} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <SkuFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={editItem} onSave={handleSave} isSaving={isCreating || isUpdating} />
    </div>
  );
}
