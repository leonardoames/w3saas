import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { Product } from "@/hooks/useProducts";

interface Props {
  products: Product[];
  selectedId: string | null;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
}

export function ProductCatalogSelector({ products, selectedId, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(() => products.find((p) => p.id === selectedId) || null, [products, selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20);
    const q = search.toLowerCase();
    return products.filter((p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 20);
  }, [products, search]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{selected.nome}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>SKU: {selected.sku}</div>
        </div>
        <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 500 }}>Vinculado ✓</span>
        <button
          onClick={() => onSelect(null)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
        >
          <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} />
        <input
          type="text"
          placeholder={placeholder || "Buscar no catálogo ou preencher manualmente"}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full outline-none"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, height: 40, fontSize: 13, color: "white", padding: "0 12px 0 34px" }}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 flex items-center gap-2"
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "white" }}
              onMouseDown={(e) => { e.preventDefault(); onSelect(p); setSearch(""); setIsOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 500 }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>SKU: {p.sku}{p.variante ? ` · ${p.variante}` : ""}</div>
              </div>
              {p.preco_venda && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>R$ {Number(p.preco_venda).toFixed(2)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
