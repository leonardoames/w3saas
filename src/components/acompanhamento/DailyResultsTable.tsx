import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface DailyResult {
  id: string;
  user_id: string;
  data: string;
  investimento: number;
  sessoes: number;
  pedidos_pagos: number;
  receita_paga: number;
}

interface DailyResultsTableProps {
  data: DailyResult[];
  onEdit: (row: DailyResult) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

const PAGE_SIZE = 15;

export function DailyResultsTable({ data, onEdit, onDelete }: DailyResultsTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Adicione dados manualmente ou importe uma planilha</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs">Data</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Investido (R$)</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Sessões</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Pedidos</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Receita (R$)</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">ROAS</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Custo Mídia</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">CPA (R$)</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">TX Conv.</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">Ticket (R$)</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-right">CPS (R$)</TableHead>
              <TableHead className="sticky top-0 bg-muted/30 font-semibold text-xs text-center w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row, i) => {
              const inv = Number(row.investimento) || 0;
              const sess = Number(row.sessoes) || 0;
              const ped = Number(row.pedidos_pagos) || 0;
              const rec = Number(row.receita_paga) || 0;
              const roas = inv > 0 ? rec / inv : 0;
              const custoMidia = rec > 0 ? (inv / rec) * 100 : 0;
              const cpa = ped > 0 ? inv / ped : 0;
              const txConv = sess > 0 ? (ped / sess) * 100 : 0;
              const ticket = ped > 0 ? rec / ped : 0;
              const cps = sess > 0 ? inv / sess : 0;

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
                  <TableCell className="text-right tabular-nums text-sm">R$ {fmt(inv)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtInt(sess)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{fmtInt(ped)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">R$ {fmt(rec)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      roas > 0 && roas < 2 ? "bg-destructive/10 text-destructive" :
                      roas >= 5 ? "bg-primary/10 text-primary" :
                      "text-foreground"
                    )}>
                      {inv > 0 ? roas.toFixed(2) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{rec > 0 ? fmtPct(custoMidia) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{ped > 0 ? "R$ " + fmt(cpa) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{sess > 0 ? fmtPct(txConv) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{ped > 0 ? "R$ " + fmt(ticket) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{sess > 0 ? "R$ " + fmt(cps) : "—"}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
