import { useState } from "react";
import { SkuReposicao, computeFields } from "@/hooks/useSkuReposicao";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  item: SkuReposicao;
  onRegisterOrder: (id: string) => Promise<void>;
  onQuickUpdateStock: (params: { id: string; estoque_atual: number }) => Promise<void>;
}

export function SkuDetailPanel({ item, onRegisterOrder, onQuickUpdateStock }: Props) {
  const [newStock, setNewStock] = useState(item.estoque_atual);
  const [saving, setSaving] = useState(false);
  const computed = computeFields(item);

  const handleUpdateStock = async () => {
    setSaving(true);
    await onQuickUpdateStock({ id: item.id, estoque_atual: newStock });
    setSaving(false);
  };

  const handleRegister = async () => {
    setSaving(true);
    await onRegisterOrder(item.id);
    setSaving(false);
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 };
  const valueStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "#FFFFFF" };

  const metrics = [
    { label: "Venda/dia", value: `${item.vendas_por_dia}`, unit: "unid/dia" },
    { label: "Lead Time Médio", value: `${item.lead_time_medio}`, unit: "dias" },
    { label: "Lead Time Máximo", value: `${item.lead_time_maximo}`, unit: "dias" },
    { label: "Ponto de Reposição", value: `${computed.ponto_reposicao}`, unit: "unidades" },
    { label: "Estoque de Segurança", value: `${item.estoque_seguranca}`, unit: "unidades" },
    { label: "Estoque zera em", value: format(computed.data_zeramento, "dd/MMM/yyyy", { locale: ptBR }), unit: "" },
  ];

  const btnStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
  };

  return (
    <div style={{ background: "#0f0f0f", borderTop: "1px solid rgba(255,255,255,0.05)", padding: 20 }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 mb-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div style={labelStyle}>{m.label}</div>
            <div style={valueStyle}>
              {m.value}{m.unit && <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleRegister} disabled={saving} style={btnStyle}>
          ✓ Registrar pedido feito
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={newStock}
            onChange={(e) => setNewStock(Number(e.target.value))}
            className="outline-none"
            style={{ width: 80, height: 32, background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 13, color: "white", padding: "0 10px", textAlign: "center" }}
          />
          <button onClick={handleUpdateStock} disabled={saving} style={btnStyle}>
            Atualizar estoque
          </button>
        </div>
      </div>
    </div>
  );
}
