import { useState, useMemo, type CSSProperties } from "react";
import { Package, Pencil, Trash2, Search, Download, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProducts, Product, ProductForm, syncProductToReposicao, useSyncOrphanReposicao } from "@/hooks/useProducts";
import { useSkuReposicao } from "@/hooks/useSkuReposicao";
import { ProductDrawer } from "@/components/produtos/ProductDrawer";
import { ImportProductsModal } from "@/components/produtos/ImportProductsModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type ModuleFilter = "all" | "reposicao" | "catalog_only";
type PriceFilter = "all" | "with_price" | "no_price";

export default function MeusProdutos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { products, isLoading, create, update, remove, isCreating, isUpdating } = useProducts();
  const { items: skuItems } = useSkuReposicao();
  const { isSyncing } = useSyncOrphanReposicao();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Build lookup: product_id -> has reposicao
  const reposicaoByProductId = useMemo(() => {
    const map = new Set<string>();
    skuItems.forEach((item: any) => { if (item.product_id) map.add(item.product_id); });
    return map;
  }, [skuItems]);

  const simulacaoByProductId = useMemo(() => new Set<string>(), []);

  const hasImportedProducts = useMemo(() => {
    return products.some((p) => p.origem_importacao);
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (moduleFilter === "reposicao") list = list.filter((p) => reposicaoByProductId.has(p.id));
    if (moduleFilter === "catalog_only") list = list.filter((p) => !reposicaoByProductId.has(p.id) && !simulacaoByProductId.has(p.id));
    if (priceFilter === "with_price") list = list.filter((p) => p.preco_venda != null);
    if (priceFilter === "no_price") list = list.filter((p) => p.preco_venda == null);
    return list;
  }, [products, search, moduleFilter, priceFilter, reposicaoByProductId, simulacaoByProductId]);

  const counts = useMemo(() => ({
    total: products.length,
    comReposicao: products.filter((p) => reposicaoByProductId.has(p.id)).length,
    semPreco: products.filter((p) => p.preco_venda == null).length,
  }), [products, reposicaoByProductId]);

  const existingProductsForImport = useMemo(() => {
    return products.map((p) => ({
      sku: p.sku,
      nome: p.nome,
      preco_venda: p.preco_venda,
      estoque_atual: p.estoque_atual,
    }));
  }, [products]);

  const handleSave = async (form: ProductForm & { id?: string }) => {
    if (form.id) {
      const updatedProduct = await update(form as any);
      if (reposicaoByProductId.has(form.id)) {
        const synced = await syncProductToReposicao(form.id, form);
        if (synced) {
          queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
          toast.success("Produto salvo e reposição atualizada");
        } else {
          toast.success("Produto salvo");
          toast.warning("Não foi possível sincronizar com a reposição");
        }
      } else {
        toast.success("Produto salvo");
      }
    } else {
      await create(form);
    }
  };

  const openCreate = () => { setEditProduct(null); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setEditProduct(p); setDrawerOpen(true); };

  const getMargin = (p: Product) => {
    if (p.preco_venda == null || p.custo_unitario == null || p.preco_venda <= 0) return null;
    return ((p.preco_venda - p.custo_unitario) / p.preco_venda) * 100;
  };

  const getBorderColor = (p: Product) => {
    const m = getMargin(p);
    if (p.preco_venda == null) return "rgba(255,255,255,0.1)";
    if (m === null) return "transparent";
    if (m < 15) return "#EF4444";
    if (m <= 30) return "#F97316";
    return "#22C55E";
  };

  const thBase: CSSProperties = {
    fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "hsl(var(--muted-foreground))",
    height: 40, padding: "0 20px", textTransform: "uppercase",
    textAlign: "left", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--card))",
  };

  if (isLoading || isSyncing) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
        {isSyncing && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sincronizando produtos do estoque...</p>
        )}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-[100px] animate-pulse rounded-xl" style={{ background: "#161616" }} />)}
        </div>
      </div>
    );
  }

  const cardData = [
    { label: "Total de Produtos", value: counts.total, sub: "SKUs cadastrados" },
    { label: "Com Reposição Ativa", value: counts.comReposicao, sub: "vinculados à reposição" },
    { label: "Sem Preço Cadastrado", value: counts.semPreco, sub: "necessitam preço", valueColor: counts.semPreco > 0 ? "#F97316" : undefined },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Meus Produtos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Catálogo central de SKUs</p>
        </div>
        <div className="flex items-center gap-2">
          {hasImportedProducts && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw style={{ width: 12, height: 12, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Sincronizar
            </button>
          )}
          <button
            onClick={() => setImportModalOpen(true)}
            className="h-9 rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Download style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            Importar Produtos
          </button>
          <button onClick={openCreate} className="h-9 rounded-md px-4 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cardData.map((c) => (
          <div key={c.label} className="p-6 rounded-xl border border-border bg-card">
            <p className="uppercase mb-3 text-[11px] font-medium tracking-[0.1em] text-muted-foreground">{c.label}</p>
            <p className="font-bold" style={{ fontSize: 32, color: c.valueColor || "#FFFFFF" }}>{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-border bg-card">
          <Package className="mb-4" style={{ width: 48, height: 48, color: "rgba(255,255,255,0.1)" }} />
          <h2 className="mb-1" style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Nenhum produto cadastrado</h2>
          <p className="max-w-md mb-6" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Cadastre seus produtos para centralizar SKUs e conectar com Reposição e Simulações
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setImportModalOpen(true)}
              className="h-9 rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Download style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Importar Produtos
            </button>
            <button onClick={openCreate} className="h-9 rounded-md px-4 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              + Novo Produto
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" style={{ width: 280 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" placeholder="Buscar por nome ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full outline-none h-9 text-sm px-3 pl-8 rounded-md bg-card border border-border" />
            </div>
            <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as ModuleFilter)}>
              <SelectTrigger className="h-9 text-sm border-border bg-card" style={{ width: 180 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                <SelectItem value="reposicao">Com reposição</SelectItem>
                <SelectItem value="catalog_only">Só no catálogo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
              <SelectTrigger className="h-9 text-sm border-border bg-card" style={{ width: 160 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Preço: Todos</SelectItem>
                <SelectItem value="with_price">Com preço</SelectItem>
                <SelectItem value="no_price">Sem preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="w-full overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 800 }}>
                <colgroup>
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thBase}>Produto</th>
                    <th style={thBase}>Preço / Custo</th>
                    <th style={thBase}>Margem</th>
                    <th style={thBase}>Estoque</th>
                    <th style={thBase}>Venda/Dia</th>
                    <th style={thBase}>Módulos Vinculados</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const margin = getMargin(p);
                    const marginColor = margin === null ? "rgba(255,255,255,0.3)" : margin > 30 ? "#22C55E" : margin >= 15 ? "#F97316" : "#EF4444";
                    const hasReposicao = reposicaoByProductId.has(p.id);
                    const hasSimulacao = simulacaoByProductId.has(p.id);

                    return (
                      <tr key={p.id} style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.05)", borderLeft: `3px solid ${getBorderColor(p)}` }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}>
                        <td style={{ padding: "0 20px" }}>
                          <div style={{ fontWeight: 600, color: "#FFFFFF", fontSize: 13 }}>{p.nome}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            SKU: {p.sku}{p.variante ? ` · ${p.variante}` : ""}
                          </div>
                          {p.origem_importacao && (
                            <span style={{
                              fontSize: 10, background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.4)", borderRadius: 4,
                              padding: "1px 6px", letterSpacing: "0.04em",
                              display: "inline-block", marginTop: 2,
                            }}>
                              {p.origem_importacao}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0 20px" }}>
                          {p.preco_venda != null ? (
                            <div>
                              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>R$ {Number(p.preco_venda).toFixed(2)} venda</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                                {p.custo_unitario != null ? `R$ ${Number(p.custo_unitario).toFixed(2)} custo` : "—"}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0 20px" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: marginColor }}>
                            {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "0 20px", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                          {p.estoque_atual}
                        </td>
                        <td style={{ padding: "0 20px", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                          {p.vendas_por_dia != null ? Number(p.vendas_por_dia).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "0 20px" }}>
                          <div className="flex flex-wrap gap-1">
                            {hasReposicao && (
                              <span style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", fontSize: 11, borderRadius: 999, padding: "2px 8px", fontWeight: 500 }}>
                                📦 Reposição
                              </span>
                            )}
                            {hasSimulacao && (
                              <span style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", fontSize: 11, borderRadius: 999, padding: "2px 8px", fontWeight: 500 }}>
                                📊 Simulação
                              </span>
                            )}
                            {!hasReposicao && !hasSimulacao && (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>📋 Só no catálogo</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "0 20px", textAlign: "right" }}>
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              onMouseEnter={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
                              onMouseLeave={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
                              <Pencil style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", transition: "color 0.15s" }} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                  onMouseEnter={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "#EF4444"; }}
                                  onMouseLeave={(e) => { (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
                                  <Trash2 style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", transition: "color 0.15s" }} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ background: "#1a1a1a", border: "1px solid #242424", borderRadius: 12, maxWidth: 480 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover produto?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso removerá o produto do catálogo. Registros vinculados na reposição continuarão funcionando.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(p.id)} style={{ background: "#EF4444" }}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={editProduct}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
        linkedModules={editProduct ? {
          reposicao: reposicaoByProductId.has(editProduct.id),
          simulacao: simulacaoByProductId.has(editProduct.id),
        } : undefined}
      />

      <ImportProductsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        existingProducts={existingProductsForImport}
      />
    </div>
  );
}
