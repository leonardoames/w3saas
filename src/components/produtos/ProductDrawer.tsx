import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Factory, Package } from "lucide-react";
import { Product, ProductForm } from "@/hooks/useProducts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (form: ProductForm & { id?: string }) => Promise<void>;
  isSaving: boolean;
  linkedModules?: { reposicao: boolean; simulacao: boolean };
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, fontSize: 13, color: "white", padding: "0 12px", outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)",
  textTransform: "uppercase", marginBottom: 16, display: "block",
};
const fieldLabelStyle: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" };
const helperStyle: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 };
const dividerStyle: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0" };

export function ProductDrawer({ open, onOpenChange, product, onSave, isSaving, linkedModules }: Props) {
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [variante, setVariante] = useState("");
  const [preco_venda, setPrecoVenda] = useState<number | "">("");
  const [custo_unitario, setCustoUnitario] = useState<number | "">("");
  const [estoque_atual, setEstoqueAtual] = useState(0);
  const [vendas_por_dia, setVendasPorDia] = useState<number | "">("");
  const [lead_time_medio, setLeadTimeMedio] = useState<number | "">("");
  const [lead_time_maximo, setLeadTimeMaximo] = useState<number | "">("");
  const [tipo_reposicao, setTipoReposicao] = useState<string>("compra_fornecedor");
  const [estoque_seguranca, setEstoqueSeguranca] = useState<number | "">("");
  const [reposicaoOpen, setReposicaoOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setNome(product.nome); setSku(product.sku); setVariante(product.variante || "");
      setPrecoVenda(product.preco_venda ?? ""); setCustoUnitario(product.custo_unitario ?? "");
      setEstoqueAtual(product.estoque_atual); setVendasPorDia(product.vendas_por_dia ?? "");
      setLeadTimeMedio(product.lead_time_medio ?? ""); setLeadTimeMaximo(product.lead_time_maximo ?? "");
      setTipoReposicao(product.tipo_reposicao || "compra_fornecedor");
      setEstoqueSeguranca(product.estoque_seguranca ?? "");
      setReposicaoOpen(!!(product.lead_time_medio || product.lead_time_maximo));
    } else {
      setNome(""); setSku(""); setVariante(""); setPrecoVenda(""); setCustoUnitario("");
      setEstoqueAtual(0); setVendasPorDia(""); setLeadTimeMedio(""); setLeadTimeMaximo("");
      setTipoReposicao("compra_fornecedor"); setEstoqueSeguranca(""); setReposicaoOpen(false);
    }
  }, [product, open]);

  const margem = useMemo(() => {
    const pv = typeof preco_venda === "number" ? preco_venda : 0;
    const cu = typeof custo_unitario === "number" ? custo_unitario : 0;
    if (pv <= 0 || cu <= 0) return null;
    return ((pv - cu) / pv) * 100;
  }, [preco_venda, custo_unitario]);

  const margemColor = margem === null ? "rgba(255,255,255,0.3)" : margem > 30 ? "#22C55E" : margem >= 15 ? "#F97316" : "#EF4444";

  const handleSave = async () => {
    if (!nome || !sku) return;
    await onSave({
      ...(product ? { id: product.id } : {}),
      nome, sku, variante: variante || null,
      preco_venda: typeof preco_venda === "number" ? preco_venda : null,
      custo_unitario: typeof custo_unitario === "number" ? custo_unitario : null,
      estoque_atual,
      vendas_por_dia: typeof vendas_por_dia === "number" ? vendas_por_dia : null,
      lead_time_medio: typeof lead_time_medio === "number" ? lead_time_medio : null,
      lead_time_maximo: typeof lead_time_maximo === "number" ? lead_time_maximo : null,
      tipo_reposicao: tipo_reposicao || null,
      estoque_seguranca: typeof estoque_seguranca === "number" ? estoque_seguranca : null,
    });
    onOpenChange(false);
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 40, borderRadius: 8, fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    border: active ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.1)",
    background: active ? "rgba(249,115,22,0.15)" : "transparent",
    color: active ? "#F97316" : "rgba(255,255,255,0.5)",
    transition: "all 0.15s",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0 border-l" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#111111" }}>
        <SheetHeader className="p-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SheetTitle style={{ color: "#FFFFFF" }}>{product ? "Editar Produto" : "Novo Produto"}</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-0">
          {/* Identificação */}
          <div style={labelStyle}>Identificação</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Nome do Produto *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Camiseta Oversized" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>SKU *</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: CAM-OVS-001" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Variante</label>
              <input value={variante} onChange={(e) => setVariante(e.target.value)} placeholder="Ex: P, Azul, 38" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Precificação */}
          <div style={labelStyle}>Precificação</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Preço de Venda</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>R$</span>
                <input type="number" min={0} step={0.01} value={preco_venda} onChange={(e) => setPrecoVenda(e.target.value ? Number(e.target.value) : "")}
                  style={{ ...inputStyle, paddingLeft: 32 }} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Custo Unitário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>R$</span>
                <input type="number" min={0} step={0.01} value={custo_unitario} onChange={(e) => setCustoUnitario(e.target.value ? Number(e.target.value) : "")}
                  style={{ ...inputStyle, paddingLeft: 32 }} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Margem: </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: margemColor }}>
                {margem !== null ? `${margem.toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Estoque e Velocidade */}
          <div style={labelStyle}>Estoque e Velocidade</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Estoque Atual</label>
              <div className="relative">
                <input type="number" min={0} value={estoque_atual || ""} onChange={(e) => setEstoqueAtual(Number(e.target.value))}
                  style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unidades</span>
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Vendas por Dia</label>
              <div className="relative">
                <input type="number" min={0} step={0.1} value={vendas_por_dia} onChange={(e) => setVendasPorDia(e.target.value ? Number(e.target.value) : "")}
                  style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unid/dia</span>
              </div>
              <p style={helperStyle}>Usado nas simulações de reposição</p>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Reposição (collapsible) */}
          <Collapsible open={reposicaoOpen} onOpenChange={setReposicaoOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500 }}>
              <ChevronRight style={{ width: 14, height: 14, transform: reposicaoOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
              Dados de reposição
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <div>
                <label style={fieldLabelStyle}>Lead Time Médio</label>
                <div className="relative">
                  <input type="number" min={0} value={lead_time_medio} onChange={(e) => setLeadTimeMedio(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>dias</span>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Lead Time Máximo</label>
                <div className="relative">
                  <input type="number" min={0} value={lead_time_maximo} onChange={(e) => setLeadTimeMaximo(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>dias</span>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Tipo de Reposição</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTipoReposicao("producao_propria")} style={toggleBtnStyle(tipo_reposicao === "producao_propria")}>
                    <Factory style={{ width: 14, height: 14 }} /> Produção
                  </button>
                  <button type="button" onClick={() => setTipoReposicao("compra_fornecedor")} style={toggleBtnStyle(tipo_reposicao === "compra_fornecedor")}>
                    <Package style={{ width: 14, height: 14 }} /> Fornecedor
                  </button>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Estoque de Segurança</label>
                <div className="relative">
                  <input type="number" min={0} value={estoque_seguranca} onChange={(e) => setEstoqueSeguranca(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unidades</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Módulos vinculados (edit only) */}
          {product && linkedModules && (
            <>
              <div style={dividerStyle} />
              <div style={labelStyle}>Módulos vinculados</div>
              <div className="space-y-2">
                {linkedModules.reposicao && (
                  <div className="flex items-center gap-2 p-2 rounded" style={{ background: "rgba(249,115,22,0.06)" }}>
                    <span style={{ fontSize: 13 }}>📦</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Reposição de Estoque</span>
                  </div>
                )}
                {linkedModules.simulacao && (
                  <div className="flex items-center gap-2 p-2 rounded" style={{ background: "rgba(99,102,241,0.06)" }}>
                    <span style={{ fontSize: 13 }}>📊</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Simulação de Cenários</span>
                  </div>
                )}
                {!linkedModules.reposicao && !linkedModules.simulacao && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Nenhum módulo vinculado</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111111" }}>
          <button onClick={() => onOpenChange(false)} style={{ flex: 1, height: 40, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving || !nome || !sku} style={{ flex: 1, height: 40, borderRadius: 8, background: "#F97316", border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: (isSaving || !nome || !sku) ? 0.5 : 1 }}>
            {isSaving ? "Salvando..." : "Salvar Produto"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
