import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface MetricRow {
  id: string;
  data: string;
  platform: string;
  faturamento: number;
  sessoes: number;
  vendas_quantidade: number;
  vendas_valor: number;
  investimento_trafego: number;
}

interface MetricsSessionsTableProps {
  data: MetricRow[];
  onUpdateSessions: (id: string, sessoes: number) => Promise<void>;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString("pt-BR");

const PAGE_SIZE = 15;

const platformLabels: Record<string, string> = {
  shopee: "Shopee",
  shopify: "Shopify",
  nuvemshop: "Nuvemshop",
  mercado_livre: "Mercado Livre",
  olist_tiny: "Olist Tiny",
  tray: "Tray",
  loja_integrada: "Loja Integrada",
};

export function MetricsSessionsTable({ data, onUpdateSessions }: MetricsSessionsTableProps) {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (id: string, currentSessoes: number) => {
    setEditingId(id);
    setEditValue(String(currentSessoes || ""));
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await onUpdateSessions(id, parseInt(editValue) || 0);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <p className="text-muted-foreground font-medium">Nenhuma métrica de integração encontrada</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Conecte uma plataforma em Integrações e sincronize seus dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <p className="text-xs text-muted-foreground">
          Clique no campo <strong>Sessões</strong> para editar manualmente (dados não disponíveis via API)
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold text-xs">Data</TableHead>
              <TableHead className="font-semibold text-xs">Plataforma</TableHead>
              <TableHead className="font-semibold text-xs text-right">Faturamento (R$)</TableHead>
              <TableHead className="font-semibold text-xs text-right">Vendas</TableHead>
              <TableHead className="font-semibold text-xs text-right bg-primary/5 border-x border-primary/20">
                Sessões ✏️
              </TableHead>
              <TableHead className="font-semibold text-xs text-right">Investimento (R$)</TableHead>
              <TableHead className="font-semibold text-xs text-right">TX Conv.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row, i) => {
              const sess = Number(row.sessoes) || 0;
              const vendas = Number(row.vendas_quantidade) || 0;
              const txConv = sess > 0 ? (vendas / sess) * 100 : 0;
              const isEditing = editingId === row.id;

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "transition-colors hover:bg-muted/20",
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}
                >
                  <TableCell className="text-sm font-medium whitespace-nowrap">
                    {format(parseISO(row.data), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
                      {platformLabels[row.platform] || row.platform}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    R$ {fmt(Number(row.faturamento) || 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {fmtInt(vendas)}
                  </TableCell>
                  <TableCell className="text-right bg-primary/5 border-x border-primary/20">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 w-20 text-xs text-right"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(row.id);
                            if (e.key === "Escape") handleCancel();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSave(row.id)}
                          disabled={saving}
                        >
                          <Check className="h-3 w-3 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleCancel}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className={cn(
                          "tabular-nums text-sm cursor-pointer hover:underline px-2 py-1 rounded transition-colors",
                          sess === 0
                            ? "text-muted-foreground/50 italic hover:text-foreground"
                            : "text-foreground"
                        )}
                        onClick={() => handleStartEdit(row.id, sess)}
                        title="Clique para editar"
                      >
                        {sess === 0 ? "inserir" : fmtInt(sess)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    R$ {fmt(Number(row.investimento_trafego) || 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {sess > 0 ? txConv.toFixed(2) + "%" : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{data.length} registros • Página {page + 1} de {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
