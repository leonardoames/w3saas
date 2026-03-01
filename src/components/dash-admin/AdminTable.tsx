import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { MentoradoRow } from "@/hooks/useDashAdmin";

interface Props {
  data: MentoradoRow[];
  visibleColumns: string[];
  columnLabels: Record<string, string>;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSort: (key: string) => void;
  sortKey: string;
  sortOrder: "asc" | "desc";
  onRowClick: (m: MentoradoRow) => void;
  isLoading: boolean;
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key.includes("_at") || key === "created_at" || key === "last_login_at" || key === "access_expires_at") {
    try { return format(parseISO(String(value)), "dd/MM/yyyy"); } catch { return String(value); }
  }
  if (key.includes("faturamento") || key.includes("investimento") || key === "revenue_goal") {
    return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  return String(value);
}

export function AdminTable({
  data, visibleColumns, columnLabels, page, totalPages,
  onPageChange, onSort, sortKey, sortOrder, onRowClick, isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col}
                    onClick={() => onSort(col)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {columnLabels[col] || col}
                      {sortKey === col && (
                        sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-muted-foreground">
                    Nenhum mentorado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                data.map((m) => (
                  <TableRow
                    key={m.user_id}
                    className="cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => onRowClick(m)}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell key={col} className="text-sm whitespace-nowrap tabular-nums">
                        {formatValue(col, (m as any)[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="h-8 text-xs border border-border"
            >
              Anterior
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 text-xs border border-border"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
