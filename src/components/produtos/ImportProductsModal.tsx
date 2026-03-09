import { useState, useMemo, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Upload, FileSpreadsheet, Globe, Search, Download, RefreshCw, ChevronLeft, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Papa from "papaparse";

// ─── Types ────────────────────────────────────────────────────
type SourceKey = "olist_tiny" | "site_proprio" | "mercado_livre" | "amazon" | "shopee" | "csv";

interface ImportProduct {
  nome: string;
  sku: string;
  variante?: string | null;
  preco_venda?: number | null;
  custo_unitario?: number | null;
  estoque_atual?: number;
  source_id?: string;
  _status?: "novo" | "ja_importado" | "atualizar";
  _error?: string;
  _selected?: boolean;
}

interface SourceConfig {
  key: SourceKey;
  label: string;
  sub: string;
  icon: React.ReactNode;
  platform?: string; // key in user_integrations
  alwaysAvailable?: boolean;
}

const SOURCES: SourceConfig[] = [
  { key: "olist_tiny", label: "Olist", sub: "ERP integrado", platform: "olist_tiny", icon: <span className="text-2xl">📦</span> },
  { key: "site_proprio", label: "Site Próprio", sub: "WooCommerce / Shopify / Nuvemshop", platform: "nuvemshop", icon: <Globe style={{ width: 28, height: 28, color: "rgba(255,255,255,0.5)" }} /> },
  { key: "mercado_livre", label: "Mercado Livre", sub: "Marketplace", platform: "mercado_livre", icon: <span className="text-2xl">🛒</span> },
  { key: "amazon", label: "Amazon", sub: "Marketplace", platform: "amazon", icon: <span className="text-2xl">📦</span> },
  { key: "shopee", label: "Shopee", sub: "Marketplace", platform: "shopee", icon: <span className="text-2xl">🟠</span> },
  { key: "csv", label: "Arquivo CSV", sub: "Importar de planilha", alwaysAvailable: true, icon: <FileSpreadsheet style={{ width: 28, height: 28, color: "rgba(255,255,255,0.5)" }} /> },
];

const STEP_LABELS = ["Fonte", "Selecionar", "Confirmar"];

// map of source api_key to edge function source parameter
const SOURCE_TO_EDGE: Record<string, string> = {
  olist_tiny: "olist_tiny",
  site_proprio: "nuvemshop",
  shopee: "shopee",
  mercado_livre: "mercado_livre",
};

// ─── Component ────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProducts: { sku: string; nome: string; preco_venda: number | null; estoque_atual: number }[];
  preselectSource?: SourceKey;
}

export function ImportProductsModal({ open, onOpenChange, existingProducts, preselectSource }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<SourceKey | null>(preselectSource || null);
  const [importProducts, setImportProducts] = useState<ImportProduct[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "novo" | "ja_importado" | "atualizar">("novo");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<"keep" | "update">("update");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: { sku: string; error: string }[] } | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch connected integrations
  const { data: integrations } = useQuery({
    queryKey: ["user_integrations_safe", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_integrations_safe" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id && open,
  });

  const connectedPlatforms = useMemo(() => {
    const set = new Set<string>();
    (integrations || []).forEach((i: any) => set.add(i.platform));
    return set;
  }, [integrations]);

  const existingSkuMap = useMemo(() => {
    const map = new Map<string, { nome: string; preco_venda: number | null; estoque_atual: number }>();
    existingProducts.forEach((p) => map.set(p.sku.toLowerCase(), p));
    return map;
  }, [existingProducts]);

  // Reset state when modal opens/closes
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTimeout(() => {
        setStep(1);
        setSelectedSource(preselectSource || null);
        setImportProducts([]);
        setSearchFilter("");
        setStatusFilter("novo");
        setLoadError(null);
        setIsImporting(false);
        setImportResult(null);
        setCsvWarnings([]);
      }, 300);
    }
    onOpenChange(v);
  };

  // ── Classify imported products against existing ──
  const classifyProducts = useCallback(
    (products: ImportProduct[]): ImportProduct[] => {
      return products.map((p) => {
        const existing = existingSkuMap.get(p.sku.toLowerCase());
        if (!existing) {
          return { ...p, _status: "novo" as const, _selected: true };
        }
        const nameChanged = existing.nome !== p.nome;
        const priceChanged = p.preco_venda != null && existing.preco_venda !== p.preco_venda;
        const stockChanged = p.estoque_atual != null && existing.estoque_atual !== p.estoque_atual;
        if (nameChanged || priceChanged || stockChanged) {
          return { ...p, _status: "atualizar" as const, _selected: true };
        }
        return { ...p, _status: "ja_importado" as const, _selected: false };
      });
    },
    [existingSkuMap]
  );

  // ── Fetch products from API ──
  const fetchFromSource = async (source: SourceKey) => {
    setIsLoadingProducts(true);
    setLoadError(null);
    try {
      const edgeSource = SOURCE_TO_EDGE[source];
      if (!edgeSource) throw new Error("Fonte não suportada para API");

      const { data, error } = await supabase.functions.invoke("fetch-products", {
        body: { source: edgeSource },
      });

      if (error) throw new Error(error.message || "Erro ao buscar produtos");
      if (data?.error) throw new Error(data.error);

      const products: ImportProduct[] = (data?.products || []).map((p: any) => ({
        nome: p.nome || "",
        sku: p.sku || "",
        variante: p.variante || null,
        preco_venda: p.preco_venda || null,
        custo_unitario: p.custo_unitario || null,
        estoque_atual: p.estoque_atual || 0,
        source_id: p.source_id || "",
      }));

      setImportProducts(classifyProducts(products));
    } catch (err: any) {
      setLoadError(err.message || "Erro desconhecido");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // ── CSV parsing ──
  const handleCSVFile = (file: File) => {
    setCsvWarnings([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const warnings: string[] = [];
        const knownCols = new Set(["nome", "sku", "variante", "preco_venda", "custo_unitario", "estoque_atual"]);
        const fields = results.meta.fields || [];
        fields.forEach((f) => {
          if (!knownCols.has(f.toLowerCase().trim())) {
            warnings.push(`Coluna '${f}' não reconhecida — será ignorada`);
          }
        });
        setCsvWarnings(warnings);

        const products: ImportProduct[] = results.data.map((row: any, idx: number) => {
          const nome = (row.nome || row.Nome || row.NOME || "").trim();
          const sku = (row.sku || row.SKU || row.Sku || "").trim();
          const p: ImportProduct = {
            nome,
            sku,
            variante: (row.variante || row.Variante || "").trim() || null,
            preco_venda: parseFloat(row.preco_venda || row.preco || row.Preco || "0") || null,
            custo_unitario: parseFloat(row.custo_unitario || row.custo || row.Custo || "0") || null,
            estoque_atual: parseInt(row.estoque_atual || row.estoque || row.Estoque || "0", 10) || 0,
          };
          if (!nome || !sku) {
            p._error = `Linha ${idx + 2}: nome ou SKU vazio`;
          }
          return p;
        });

        setImportProducts(classifyProducts(products));
        setStep(2);
      },
      error: () => {
        toast.error("Erro ao processar o CSV");
      },
    });
  };

  const downloadCSVTemplate = () => {
    const csv = "nome,sku,variante,preco_venda,custo_unitario,estoque_atual\nCamiseta Básica,CAM-001,P - Branca,79.90,25.00,50\nCalça Jeans,CJ-002,M - Azul,159.90,55.00,30\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Step navigation ──
  const goToStep2 = () => {
    if (!selectedSource) return;
    if (selectedSource === "csv") {
      fileInputRef.current?.click();
      return;
    }
    setStep(2);
    fetchFromSource(selectedSource);
  };

  // ── Filtered product list ──
  const filteredProducts = useMemo(() => {
    let list = importProducts;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p._status === statusFilter);
    }
    return list;
  }, [importProducts, searchFilter, statusFilter]);

  const selectedProducts = useMemo(() => importProducts.filter((p) => p._selected), [importProducts]);
  const counts = useMemo(() => ({
    novos: importProducts.filter((p) => p._status === "novo" && p._selected).length,
    atualizar: importProducts.filter((p) => p._status === "atualizar" && p._selected).length,
    ignorados: importProducts.filter((p) => !p._selected || p._status === "ja_importado").length,
  }), [importProducts]);

  const toggleProduct = (idx: number) => {
    setImportProducts((prev) => prev.map((p, i) => i === idx ? { ...p, _selected: !p._selected } : p));
  };

  const toggleAll = (checked: boolean) => {
    setImportProducts((prev) => prev.map((p) => ({ ...p, _selected: p._error ? false : checked })));
  };

  // ── Import execution ──
  const executeImport = async () => {
    if (!user?.id) return;
    setIsImporting(true);
    const toImport = selectedProducts.filter((p) => !p._error);
    setImportProgress({ current: 0, total: toImport.length });

    const result = { created: 0, updated: 0, skipped: 0, errors: [] as { sku: string; error: string }[] };
    const sourceLabel = SOURCES.find((s) => s.key === selectedSource)?.label || selectedSource || "";

    for (let i = 0; i < toImport.length; i++) {
      const p = toImport[i];
      setImportProgress({ current: i + 1, total: toImport.length });

      try {
        const existing = existingSkuMap.get(p.sku.toLowerCase());

        if (!existing) {
          // INSERT new product
          const { error } = await supabase.from("products" as any).insert({
            user_id: user.id,
            nome: p.nome,
            sku: p.sku,
            variante: p.variante || null,
            preco_venda: p.preco_venda || null,
            custo_unitario: p.custo_unitario || null,
            estoque_atual: p.estoque_atual || 0,
            origem_importacao: sourceLabel,
          } as any);
          if (error) throw error;
          result.created++;
        } else if (p._status === "atualizar") {
          if (duplicateHandling === "update") {
            // UPDATE only nome, preco_venda, estoque_atual — never custo_unitario, lead_time, etc.
            const updateData: any = {};
            if (p.nome) updateData.nome = p.nome;
            if (p.preco_venda != null) updateData.preco_venda = p.preco_venda;
            if (p.estoque_atual != null) updateData.estoque_atual = p.estoque_atual;

            const { error } = await supabase
              .from("products" as any)
              .update(updateData)
              .eq("user_id", user.id)
              .eq("sku", p.sku);
            if (error) throw error;
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          result.skipped++;
        }
      } catch (err: any) {
        result.errors.push({ sku: p.sku, error: err.message || "Erro desconhecido" });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["products"] });
    setImportResult(result);
    setIsImporting(false);
  };

  const downloadErrorReport = () => {
    if (!importResult) return;
    const csv = "sku,erro\n" + importResult.errors.map((e) => `"${e.sku}","${e.error}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToStep1 = () => {
    setStep(1);
    setSelectedSource(null);
    setImportProducts([]);
    setSearchFilter("");
    setStatusFilter("novo");
    setLoadError(null);
    setIsImporting(false);
    setImportResult(null);
    setCsvWarnings([]);
  };

  // ─── Render ─────────────────────────────────────────────────
  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: active ? 600 : 400, padding: "3px 10px",
    borderRadius: 999, cursor: "pointer",
    background: active ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.06)",
    color: active ? "#F97316" : "rgba(255,255,255,0.5)",
    border: "none",
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="p-0 gap-0 border-0 max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: 680, background: "#161616", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}
      >
        <div className="p-8">
          {/* Step indicator */}
          {!importResult && (
            <div className="flex items-center justify-center gap-6 mb-8">
              {STEP_LABELS.map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = step === stepNum;
                const isPast = step > stepNum;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: isActive ? "#F97316" : isPast ? "#FFFFFF" : "rgba(255,255,255,0.2)",
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#F97316" : isPast ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                    }}>
                      {stepNum} · {label}
                    </span>
                    {idx < STEP_LABELS.length - 1 && (
                      <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── STEP 1: Source selection ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>De onde deseja importar?</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Selecione uma integração ativa para buscar seus produtos</p>

              <div className="grid grid-cols-2 gap-3">
                {SOURCES.map((src) => {
                  const connected = src.alwaysAvailable || connectedPlatforms.has(src.platform || "");
                  const isSelected = selectedSource === src.key;
                  const disabled = !connected;

                  return (
                    <button
                      key={src.key}
                      disabled={disabled}
                      onClick={() => !disabled && setSelectedSource(src.key)}
                      className="relative text-left transition-all"
                      style={{
                        height: 140, borderRadius: 12, padding: 20,
                        background: isSelected ? "rgba(249,115,22,0.06)" : "#1a1a1a",
                        border: `1px solid ${isSelected ? "#F97316" : "rgba(255,255,255,0.07)"}`,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <Check style={{ width: 16, height: 16, color: "#F97316" }} />
                        </div>
                      )}
                      <div className="mb-3">{src.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{src.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{src.sub}</div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: src.alwaysAvailable ? "#22C55E" : connected ? "#22C55E" : "rgba(255,255,255,0.25)",
                        }} />
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                          {src.alwaysAvailable ? "Sempre disponível" : connected ? "Conectado" : "Não configurado"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 20, textAlign: "center" }}>
                Não encontrou sua integração?{" "}
                <a href="/app/integracoes" style={{ color: "#F97316", textDecoration: "underline" }}>Configure em Integrações</a>
              </p>

              <div className="flex justify-end mt-6">
                <button
                  disabled={!selectedSource}
                  onClick={goToStep2}
                  style={{
                    background: selectedSource ? "#F97316" : "rgba(255,255,255,0.1)",
                    color: selectedSource ? "#000" : "rgba(255,255,255,0.3)",
                    fontWeight: 600, fontSize: 13, height: 36, padding: "0 20px",
                    borderRadius: 8, border: "none", cursor: selectedSource ? "pointer" : "not-allowed",
                  }}
                >
                  Próximo
                </button>
              </div>

              {/* Hidden CSV file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCSVFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* ── STEP 2: Product selection ── */}
          {step === 2 && !importResult && (
            <div>
              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="animate-spin mb-4" style={{ width: 32, height: 32, color: "#F97316" }} />
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                    Buscando produtos na {SOURCES.find((s) => s.key === selectedSource)?.label}...
                  </p>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="mb-4" style={{ width: 32, height: 32, color: "#EF4444" }} />
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Erro ao buscar produtos</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 400, marginBottom: 16 }}>{loadError}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => selectedSource && fetchFromSource(selectedSource)}
                      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer" }}
                    >
                      Tentar novamente
                    </button>
                    <button
                      onClick={() => { setSelectedSource("csv"); fileInputRef.current?.click(); }}
                      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer" }}
                    >
                      Importar via CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 16 }}>Selecionar produtos</h2>

                  {/* CSV warnings */}
                  {csvWarnings.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                      {csvWarnings.map((w, i) => (
                        <p key={i} style={{ fontSize: 11, color: "#F97316" }}>⚠ {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Search + filter */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} />
                      <input
                        type="text"
                        placeholder="Filtrar por nome ou SKU..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full outline-none"
                        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 36, fontSize: 13, color: "white", padding: "0 12px 0 34px" }}
                      />
                    </div>
                    <div className="flex gap-1">
                      {(["all", "novo", "ja_importado", "atualizar"] as const).map((f) => (
                        <button key={f} onClick={() => setStatusFilter(f)} style={pillStyle(statusFilter === f)}>
                          {{ all: "Todos", novo: "Novos", ja_importado: "Já importados", atualizar: "Atualizar" }[f]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select all header */}
                  <div className="flex items-center gap-3 py-2 px-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && filteredProducts.every((p) => p._selected)}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="accent-orange-500"
                      style={{ width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Selecionar todos ({filteredProducts.length})
                    </span>
                  </div>

                  {/* Product list */}
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {filteredProducts.length === 0 ? (
                      <div className="py-12 text-center">
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      filteredProducts.map((p, globalIdx) => {
                        const realIdx = importProducts.indexOf(p);
                        const statusBadge = {
                          novo: { bg: "rgba(34,197,94,0.12)", color: "#22C55E", label: "Novo" },
                          ja_importado: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", label: "Já importado" },
                          atualizar: { bg: "rgba(249,115,22,0.12)", color: "#F97316", label: "Atualizar" },
                        }[p._status || "novo"];

                        return (
                          <div
                            key={`${p.sku}-${globalIdx}`}
                            className="flex items-center gap-3 px-3"
                            style={{
                              height: 56, borderBottom: "1px solid rgba(255,255,255,0.05)",
                              opacity: p._error ? 0.5 : 1,
                              background: p._error ? "rgba(239,68,68,0.04)" : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!p._selected}
                              disabled={!!p._error}
                              onChange={() => toggleProduct(realIdx)}
                              className="accent-orange-500"
                              style={{ width: 14, height: 14 }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="truncate" style={{ fontWeight: 500, fontSize: 13, color: "#FFFFFF" }}>{p.nome}</div>
                              <div className="truncate" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                                SKU: {p.sku}{p.variante ? ` · ${p.variante}` : ""}
                                {p._error && <span style={{ color: "#EF4444", marginLeft: 8 }}>⚠ {p._error}</span>}
                              </div>
                            </div>
                            {p.preco_venda != null && (
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
                                R$ {Number(p.preco_venda).toFixed(2)}
                              </span>
                            )}
                            <span style={{
                              fontSize: 10, padding: "2px 8px", borderRadius: 999,
                              background: statusBadge.bg, color: statusBadge.color,
                              whiteSpace: "nowrap", fontWeight: 500,
                            }}>
                              {statusBadge.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <p className="mt-3" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {selectedProducts.length} produto{selectedProducts.length !== 1 ? "s" : ""} selecionado{selectedProducts.length !== 1 ? "s" : ""}
                  </p>

                  {/* Footer */}
                  <div className="flex justify-between mt-6">
                    <button onClick={() => setStep(1)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, cursor: "pointer" }}>
                      <ChevronLeft style={{ width: 14, height: 14, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                      Voltar
                    </button>
                    <button
                      disabled={selectedProducts.length === 0}
                      onClick={() => setStep(3)}
                      style={{
                        background: selectedProducts.length > 0 ? "#F97316" : "rgba(255,255,255,0.1)",
                        color: selectedProducts.length > 0 ? "#000" : "rgba(255,255,255,0.3)",
                        fontWeight: 600, fontSize: 13, height: 36, padding: "0 20px", borderRadius: 8, border: "none",
                        cursor: selectedProducts.length > 0 ? "pointer" : "not-allowed",
                      }}
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirmation ── */}
          {step === 3 && !isImporting && !importResult && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>Confirmar importação</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Revise o que será criado ou atualizado</p>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Novos produtos", value: counts.novos, color: "#22C55E" },
                  { label: "Para atualizar", value: counts.atualizar, color: "#F97316" },
                  { label: "Ignorados", value: counts.ignorados, color: "rgba(255,255,255,0.3)" },
                ].map((c) => (
                  <div key={c.label} className="p-4 rounded-xl text-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Field mapping */}
              <div className="mb-6">
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Campos importados
                </p>
                <div className="space-y-1.5">
                  {[
                    { field: "Nome do produto → nome", available: true },
                    { field: "SKU → sku", available: true },
                    { field: "Preço de venda → preco_venda", available: true },
                    { field: "Estoque → estoque_atual", available: true },
                    { field: "Variante → variante", available: selectedSource === "csv" || selectedSource === "site_proprio" },
                    { field: "Custo → custo_unitario", available: selectedSource === "csv" || selectedSource === "olist_tiny" },
                  ].map((f) => (
                    <div key={f.field} className="flex items-center gap-2">
                      <span style={{ color: f.available ? "#22C55E" : "rgba(255,255,255,0.2)", fontSize: 12 }}>
                        {f.available ? "✓" : "—"}
                      </span>
                      <span style={{ fontSize: 12, color: f.available ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>
                        {f.field}
                        {!f.available && <span style={{ marginLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Preencha manualmente após importar</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate handling */}
              {counts.atualizar > 0 && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Produtos duplicados</p>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="radio" name="dup" checked={duplicateHandling === "keep"} onChange={() => setDuplicateHandling("keep")} className="accent-orange-500" />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Manter dados existentes, só adicionar novos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="dup" checked={duplicateHandling === "update"} onChange={() => setDuplicateHandling("update")} className="accent-orange-500" />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Atualizar nome e preço dos já importados</span>
                  </label>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, cursor: "pointer" }}>
                  <ChevronLeft style={{ width: 14, height: 14, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Voltar
                </button>
                <button
                  onClick={executeImport}
                  style={{ background: "#F97316", color: "#000", fontWeight: 700, fontSize: 13, height: 36, padding: "0 20px", borderRadius: 8, border: "none", cursor: "pointer" }}
                >
                  Importar agora
                </button>
              </div>
            </div>
          )}

          {/* ── Importing progress ── */}
          {isImporting && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin mb-4" style={{ width: 32, height: 32, color: "#F97316" }} />
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                Importando {importProgress.current} de {importProgress.total} produtos...
              </p>
              <div style={{ width: "100%", maxWidth: 300, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{
                  width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  height: "100%", background: "#F97316", borderRadius: 2, transition: "width 0.3s",
                }} />
              </div>
            </div>
          )}

          {/* ── Import result ── */}
          {importResult && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 style={{ width: 48, height: 48, color: "#22C55E", marginBottom: 16 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>Importação concluída!</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
                {importResult.created} produto{importResult.created !== 1 ? "s" : ""} criado{importResult.created !== 1 ? "s" : ""}
                {" · "}
                {importResult.updated} atualizado{importResult.updated !== 1 ? "s" : ""}
                {" · "}
                {importResult.skipped} ignorado{importResult.skipped !== 1 ? "s" : ""}
              </p>

              {importResult.errors.length > 0 && (
                <div className="w-full mb-6 p-4 rounded-xl text-left" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginBottom: 8 }}>
                    {importResult.errors.length} produto{importResult.errors.length !== 1 ? "s" : ""} falharam
                  </p>
                  <div style={{ maxHeight: 120, overflowY: "auto" }}>
                    {importResult.errors.map((e, i) => (
                      <p key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        SKU: {e.sku} — {e.error}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={downloadErrorReport}
                    className="mt-3"
                    style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  >
                    📥 Baixar relatório de erros
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenChange(false)}
                  style={{ background: "#F97316", color: "#000", fontWeight: 600, fontSize: 13, height: 36, padding: "0 20px", borderRadius: 8, border: "none", cursor: "pointer" }}
                >
                  Ver meus produtos
                </button>
                <button
                  onClick={resetToStep1}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, cursor: "pointer" }}
                >
                  Importar de outra fonte
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
