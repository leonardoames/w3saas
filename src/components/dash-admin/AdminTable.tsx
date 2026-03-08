import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import type { MentoradoRow } from "@/hooks/useDashAdmin";

interface Props {
  data: MentoradoRow[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSort: (key: string) => void;
  sortKey: string;
  sortOrder: "asc" | "desc";
  onRowClick: (m: MentoradoRow) => void;
  isLoading: boolean;
}

function getStatusBadge(status: string, expiresAt: string | null) {
  const now = new Date();
  if (expiresAt) {
    const exp = parseISO(expiresAt);
    const days = differenceInDays(exp, now);
    if (days >= 0 && days <= 7) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px]">Expirando</Badge>;
    }
  }
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">Ativo</Badge>;
    case "suspended":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800 text-[10px]">Suspenso</Badge>;
    case "expired":
      return <Badge className="bg-muted text-muted-foreground text-[10px]">Expirado</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function formatLastLogin(dateStr: string | null) {
  if (!dateStr) return <span className="text-muted-foreground">Nunca</span>;
  const days = differenceInDays(new Date(), parseISO(dateStr));
  if (days === 0) return <span className="text-emerald-600 dark:text-emerald-400">Hoje</span>;
  if (days === 1) return <span>Ontem</span>;
  const color = days > 15 ? "text-red-500" : "text-foreground";
  return <span className={color}>{days}d atrás</span>;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function TrendIcon({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  if (lastMonth === 0 && thisMonth === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (thisMonth >= lastMonth) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
}

const SORT_COLS = [
  { key: "full_name", label: "Nome" },
  { key: "access_status", label: "Status" },
  { key: "plan_type", label: "Plano" },
  { key: "last_login_at", label: "Último Login" },
  { key: "total_faturamento", label: "Faturamento" },
  { key: "trend", label: "Tend." },
];

export function AdminTable({
  data, page, totalPages, onPageChange, onSort, sortKey, sortOrder, onRowClick, isLoading,
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
                {SORT_COLS.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={() => col.key !== "trend" && onSort(col.key)}
                    className={`${col.key !== "trend" ? "cursor-pointer hover:bg-muted/50" : ""} transition-colors text-xs font-medium whitespace-nowrap`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-xs font-medium w-10">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={SORT_COLS.length + 1} className="text-center py-12 text-muted-foreground">
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
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(m.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.full_name || "Sem nome"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(m.access_status, m.access_expires_at)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{m.plan_type}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatLastLogin(m.last_login_at)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap tabular-nums font-medium">
                      R$ {(m.total_faturamento || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      <TrendIcon thisMonth={m.revenue_this_month || 0} lastMonth={m.revenue_last_month || 0} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); onRowClick(m); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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
