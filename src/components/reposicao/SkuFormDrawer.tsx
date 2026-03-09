import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
      setNomePeca(item.nome_peca); setSku(item.sku); setVariante(item.variante || "");
      setTipoReposicao(item.tipo_reposicao); setEstoqueAtual(item.estoque_atual);
      setVendasPorDia(item.vendas_por_dia); setLeadTimeMedio(item.lead_time_medio);
      setLeadTimeMaximo(item.lead_time_maximo); setEstoqueSeguranca(item.estoque_seguranca);
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
          <SheetTitle style={{ color: "#FFFFFF" }}>{item ? "Editar Peça" : "Cadastrar Peça"}</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-0">
          {/* Section 1 */}
          <div style={labelStyle}>Identificação</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Nome da Peça *</label>
              <input value={nome_peca} onChange={(e) => setNomePeca(e.target.value)} placeholder="Ex: Camiseta Oversized" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>SKU *</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: CAM-OVS-001" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
              <p style={helperStyle}>Código único do produto</p>
            </div>
            <div>
              <label style={fieldLabelStyle}>Variante</label>
              <input value={variante} onChange={(e) => setVariante(e.target.value)} placeholder="Ex: P, Azul, 38, Único" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Tipo de Reposição</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTipoReposicao("producao_propria")} style={toggleBtnStyle(tipo_reposicao === "producao_propria")}>
                  <Factory style={{ width: 14, height: 14 }} /> Produção Própria
                </button>
                <button type="button" onClick={() => setTipoReposicao("compra_fornecedor")} style={toggleBtnStyle(tipo_reposicao === "compra_fornecedor")}>
                  <Package style={{ width: 14, height: 14 }} /> Fornecedor
                </button>
              </div>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Section 2 */}
          <div style={labelStyle}>Estoque Atual</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Estoque Atual *</label>
              <div className="relative">
                <input type="number" min={0} value={estoque_atual || ""} onChange={(e) => setEstoqueAtual(Number(e.target.value))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unidades</span>
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Observações</label>
              <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas sobre o produto..." style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "none" }} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Section 3 */}
          <div style={labelStyle}>Velocidade de Vendas</div>
          <div>
            <label style={fieldLabelStyle}>Vendas por Dia *</label>
            <div className="relative">
              <input type="number" min={0} step={0.1} value={vendas_por_dia || ""} onChange={(e) => setVendasPorDia(Number(e.target.value))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unidades/dia</span>
            </div>
            <p style={helperStyle}>Dica: divida as vendas dos últimos 30 dias por 30</p>
          </div>

          <div style={dividerStyle} />

          {/* Section 4 */}
          <div style={labelStyle}>Tempo de Reposição</div>
          <div className="space-y-3">
            <div>
              <label style={fieldLabelStyle}>Tempo médio para chegar/produzir *</label>
              <div className="relative">
                <input type="number" min={0} value={lead_time_medio || ""} onChange={(e) => setLeadTimeMedio(Number(e.target.value))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>dias</span>
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Pior caso já registrado *</label>
              <div className="relative">
                <input type="number" min={0} value={lead_time_maximo || ""} onChange={(e) => setLeadTimeMaximo(Number(e.target.value))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>dias</span>
              </div>
              <p style={helperStyle}>O lead time máximo é usado para calcular o estoque de segurança</p>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Section 5 */}
          <div style={labelStyle}>Estoque de Segurança</div>
          {!manualSafety ? (
            <div className="rounded-lg p-3" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#F97316" }}>{Math.max(0, autoSafety)} unidades</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Calculado automaticamente</p>
            </div>
          ) : (
            <div className="relative">
              <input type="number" min={0} value={estoque_seguranca || ""} onChange={(e) => setEstoqueSeguranca(Number(e.target.value))} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#F97316"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>unidades</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => setManualSafety(!manualSafety)}
              className="relative"
              style={{ width: 36, height: 20, borderRadius: 10, background: manualSafety ? "#F97316" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", transition: "background 0.2s" }}
            >
              <span style={{ position: "absolute", top: 2, left: manualSafety ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
            </button>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Definir manualmente</span>
          </div>
          <p style={{ ...helperStyle, marginTop: 8 }}>Unidades extras para cobrir atrasos e picos de demanda</p>

          <div style={dividerStyle} />

          {/* Section 6 */}
          <div style={labelStyle}>Último Pedido</div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                style={{
                  ...inputStyle,
                  display: "flex", alignItems: "center", gap: 8,
                  color: data_ultimo_pedido ? "white" : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                }}
              >
                <CalendarIcon style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} />
                {data_ultimo_pedido ? format(data_ultimo_pedido, "dd/MM/yyyy") : "Selecionar data"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={data_ultimo_pedido} onSelect={setDataUltimoPedido} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <p style={helperStyle}>Usado para histórico de reposições</p>

          {/* Live Preview */}
          {canCompute && (
            <>
              <div style={dividerStyle} />
              <div style={labelStyle}>Resultado do cálculo</div>
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📅 Pedir em</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#F97316", marginTop: 2 }}>{format(computed.data_pedido, "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>⚠️ Estoque zera em</span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginTop: 2 }}>{format(computed.data_zeramento, "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>🛡️ Estoque de segurança</span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginTop: 2 }}>{manualSafety ? estoque_seguranca : Math.max(0, autoSafety)} unidades</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111111" }}>
          <button onClick={() => onOpenChange(false)} style={{ flex: 1, height: 40, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving || !nome_peca || !sku} style={{ flex: 1, height: 40, borderRadius: 8, background: "#F97316", border: "none", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: (isSaving || !nome_peca || !sku) ? 0.5 : 1 }}>
            {isSaving ? "Salvando..." : "Salvar Peça"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
