import { useState, useMemo, Fragment } from "react";
import { Plus, Package, Pencil, Trash2, ChevronRight, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSkuReposicao, SkuReposicao, SkuReposicaoForm, computeFields, ComputedFields } from "@/hooks/useSkuReposicao";
import { SkuFormDrawer } from "@/components/reposicao/SkuFormDrawer";
import { SkuDetailPanel } from "@/components/reposicao/SkuDetailPanel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "all" | "critico" | "atencao" | "seguro";
type TipoFilter = "all" | "producao_propria" | "compra_fornecedor";
type SortKey = "nome_peca" | "tipo_reposicao" | "estoque_atual" | "data_pedido" | "status";
type SortDir = "asc" | "desc";

type EnrichedItem = SkuReposicao & { computed: ComputedFields };

function getDateLabel(dataPedido: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((dataPedido.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Atrasado", color: "#EF4444", weight: 700 };
  if (diff === 0) return { text: "Hoje", color: "#EF4444", weight: 700 };
  if (diff <= 7) return { text: format(dataPedido, "dd/MMM", { locale: ptBR }), color: "#F97316", weight: 600 };
  return { text: format(dataPedido, "dd/MMM", { locale: ptBR }), color: "rgba(255,255,255,0.7)", weight: 400 };
}

function getStatusDot(status: ComputedFields["status"]) {
  switch (status) {
    case "critico": return { color: "#EF4444", label: "Pedir agora" };
    case "atencao": return { color: "#F97316", label: "Esta semana" };
    case "seguro": return { color: "#22C55E", label: "Em dia" };
  }
}

function getBorderColor(status: ComputedFields["status"]) {
  if (status === "critico") return "#EF4444";
  if (status === "atencao") return "#F97316";
  return "transparent";
}

const statusOrder = { critico: 0, atencao: 1, seguro: 2 };

function sortItems(list: EnrichedItem[], key: SortKey, dir: SortDir): EnrichedItem[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "nome_peca": cmp = a.nome_peca.localeCompare(b.nome_peca); break;
      case "tipo_reposicao": cmp = a.tipo_reposicao.localeCompare(b.tipo_reposicao); break;
      case "estoque_atual": cmp = a.estoque_atual - b.estoque_atual; break;
      case "data_pedido": cmp = a.computed.data_pedido.getTime() - b.computed.data_pedido.getTime(); break;
      case "status": cmp = statusOrder[a.computed.status] - statusOrder[b.computed.status]; break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function ReposicaoEstoque() {
  const { items, isLoading, create, update, remove, quickUpdateStock, registerOrder, isCreating, isUpdating } = useSkuReposicao();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<SkuReposicao | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data_pedido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const enriched = useMemo(() => items.map((item) => ({ ...item, computed: computeFields(item) })), [items]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (statusFilter !== "all") list = list.filter((i) => i.computed.status === statusFilter);
    if (tipoFilter !== "all") list = list.filter((i) => i.tipo_reposicao === tipoFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.nome_peca.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return sortItems(list, sortKey, sortDir);
  }, [enriched, statusFilter, tipoFilter, search, sortKey, sortDir]);

  const counts = useMemo(() => ({
    total: enriched.length,
    critico: enriched.filter((i) => i.computed.status === "critico").length,
    atencao: enriched.filter((i) => i.computed.status === "atencao").length,
    seguro: enriched.filter((i) => i.computed.status === "seguro").length,
  }), [enriched]);

  const handleSave = async (form: SkuReposicaoForm & { id?: string }) => {
    if (form.id) await update(form as any);
    else await create(form);
  };

  const openCreate = () => { setEditItem(null); setDrawerOpen(true); };
  const openEdit = (item: SkuReposicao) => { setEditItem(item); setDrawerOpen(true); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown style={{ width: 12, height: 12, color: "rgba(255,255,255,0.15)", marginLeft: 4, flexShrink: 0 }} />;
    return sortDir === "asc"
      ? <ArrowUp style={{ width: 12, height: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4, flexShrink: 0 }} />
      : <ArrowDown style={{ width: 12, height: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4, flexShrink: 0 }} />;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-[100px] animate-pulse rounded-xl" style={{ background: "#161616" }} />)}
        </div>
      </div>
    );
  }

  const cardData = [
    { label: "Peças Cadastradas", value: counts.total, sub: "SKUs monitorados", valueColor: undefined },
    { label: "Pedir Hoje", value: counts.critico, sub: "requerem ação imediata", valueColor: counts.critico > 0 ? "#EF4444" : undefined },
    { label: "Próximos 7 dias", value: counts.atencao, sub: "pedidos esta semana", valueColor: undefined },
    { label: "Em Dia", value: counts.seguro, sub: "sem urgência", valueColor: undefined },
  ];

  const thBase: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)",
    height: 40, padding: "0 20px", textTransform: "uppercase", cursor: "pointer", userSelect: "none",
    textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#111111",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reposição de Estoque</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Gestão de ponto de reposição por SKU</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cardData.map((c) => (
          <div key={c.label} className="p-6 rounded-xl" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="uppercase mb-3" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" }}>{c.label}</p>
            <p className="font-bold" style={{ fontSize: 32, color: c.valueColor || "#FFFFFF" }}>{c.value}</p>
            <p className="mt-1" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Package className="mb-4" style={{ width: 48, height: 48, color: "rgba(255,255,255,0.1)" }} />
          <h2 className="mb-1" style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Nenhuma peça cadastrada</h2>
          <p className="max-w-md mb-6" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Cadastre SKUs para calcular automaticamente a data de cada pedido
          </p>
          <button onClick={openCreate} style={{ background: "#F97316", color: "#000", fontWeight: 600, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            + Cadastrar Peça
          </button>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" style={{ width: 280 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} />
              <input
                type="text"
                placeholder="Buscar SKU ou peça..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full outline-none"
                style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 36, fontSize: 13, color: "white", padding: "0 12px 0 34px" }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="border-0 outline-none ring-0 focus:ring-0" style={{ width: 180, background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 36, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: Todos</SelectItem>
                <SelectItem value="critico">Status: Crítico</SelectItem>
                <SelectItem value="atencao">Status: Atenção</SelectItem>
                <SelectItem value="seguro">Status: Em dia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
              <SelectTrigger className="border-0 outline-none ring-0 focus:ring-0" style={{ width: 180, background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 36, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tipo: Todos</SelectItem>
                <SelectItem value="producao_propria">Tipo: Produção</SelectItem>
                <SelectItem value="compra_fornecedor">Tipo: Fornecedor</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <button onClick={openCreate} style={{ background: "#F97316", color: "#000", fontWeight: 600, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                + Cadastrar Peça
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-full overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 700 }}>
                <colgroup>
                  <col style={{ width: 35 }} />
                  <col />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thBase, cursor: "default" }} />
                    <th style={thBase} onClick={() => handleSort("nome_peca")}>
                      <span className="flex items-center">Peça <SortIcon col="nome_peca" /></span>
                    </th>
                    <th style={thBase} onClick={() => handleSort("tipo_reposicao")}>
                      <span className="flex items-center">Tipo <SortIcon col="tipo_reposicao" /></span>
                    </th>
                    <th style={thBase} onClick={() => handleSort("estoque_atual")}>
                      <span className="flex items-center">Estoque <SortIcon col="estoque_atual" /></span>
                    </th>
                    <th style={thBase} onClick={() => handleSort("data_pedido")}>
                      <span className="flex items-center">📅 Pedir em <SortIcon col="data_pedido" /></span>
                    </th>
                    <th style={thBase} onClick={() => handleSort("status")}>
                      <span className="flex items-center">Status <SortIcon col="status" /></span>
                    </th>
                    <th style={{ ...thBase, textAlign: "right", cursor: "default" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const { computed } = item;
                    const dateLabel = getDateLabel(computed.data_pedido);
                    const statusDot = getStatusDot(computed.status);
                    const isOpen = expandedId === item.id;
                    const diasRestantes = Math.max(0, Math.floor(computed.dias_restantes));

                    return (
                      <Fragment key={item.id}>
                        <tr
                          className="cursor-pointer"
                          onClick={() => setExpandedId(isOpen ? null : item.id)}
                          style={{
                            height: 56,
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            borderLeft: `3px solid ${getBorderColor(computed.status)}`,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                        >
                          <td style={{ padding: "0 8px" }}>
                            <ChevronRight
                              style={{
                                width: 14, height: 14,
                                color: "rgba(255,255,255,0.25)",
                                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                                transition: "transform 0.15s",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0 20px" }}>
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontWeight: 600, color: "#FFFFFF", fontSize: 13 }}>{item.nome_peca}</span>
                              {(item as any).product_id && (
                                <span title="Vinculado ao catálogo de produtos" style={{ fontSize: 12, cursor: "default" }}>🔗</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                              SKU: {item.sku}{item.variante ? ` · ${item.variante}` : ""}
                            </div>
                          </td>
                          <td style={{ padding: "0 20px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                            {item.tipo_reposicao === "producao_propria" ? "Produção" : "Fornecedor"}
                          </td>
                          <td style={{ padding: "0 20px" }}>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{item.estoque_atual}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>unidades</div>
                          </td>
                          <td style={{ padding: "0 20px" }}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <div style={{ color: dateLabel.color, fontWeight: dateLabel.weight, fontSize: 13 }}>{dateLabel.text}</div>
                                  <div style={{ fontSize: 11, color: dateLabel.color, opacity: 0.7 }}>{diasRestantes} dias restantes</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Faça o pedido nesta data para receber antes de zerar o estoque</TooltipContent>
                            </Tooltip>
                          </td>
                          <td style={{ padding: "0 20px" }}>
                            <div className="flex items-center gap-2">
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot.color, display: "inline-block", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{statusDot.label}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0 20px", textAlign: "right" }}>
                            <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEdit(item)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                onMouseEnter={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
                                onMouseLeave={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
                              >
                                <Pencil style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", transition: "color 0.15s" }} />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                    onMouseEnter={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "#EF4444"; }}
                                    onMouseLeave={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
                                  >
                                    <Trash2 style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", transition: "color 0.15s" }} />
                                  </button>
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
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <SkuDetailPanel item={item} onRegisterOrder={registerOrder} onQuickUpdateStock={quickUpdateStock} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SkuFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={editItem} onSave={handleSave} isSaving={isCreating || isUpdating} />
    </div>
  );
}
