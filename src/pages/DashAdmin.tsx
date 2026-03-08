import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashAdmin, MentoradoRow } from "@/hooks/useDashAdmin";
import { AdminKPIs } from "@/components/dash-admin/AdminKPIs";
import { AdminAlerts } from "@/components/dash-admin/AdminAlerts";
import { AdminCharts } from "@/components/dash-admin/AdminCharts";
import { AdminFilters } from "@/components/dash-admin/AdminFilters";
import { AdminTable } from "@/components/dash-admin/AdminTable";
import { MentoradoDetailModal } from "@/components/dash-admin/MentoradoDetailModal";
import { ColumnSelector } from "@/components/dash-admin/ColumnSelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Columns3, Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_COLUMNS = [
  "full_name", "email", "access_status", "plan_type",
  "created_at", "last_login_at", "total_faturamento",
];

const COLUMN_LABELS: Record<string, string> = {
  user_id: "ID", email: "E-mail", full_name: "Nome",
  access_status: "Status", plan_type: "Plano",
  is_mentorado: "Mentorado", is_w3_client: "Cliente W3",
  access_expires_at: "Expiração", created_at: "Cadastro",
  last_login_at: "Último Login", revenue_goal: "Meta Faturamento",
  total_faturamento: "Faturamento Total", total_sessoes: "Sessões Total",
  total_investimento: "Investimento Total", total_pedidos: "Pedidos Total",
  updated_at: "Atualização",
};

export default function DashAdmin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const {
    paginated, page, setPage, totalPages, filters, setFilters,
    kpis, monthlyRevenue, top5, allColumns, exportCSV, isLoading, mentorados, allMentorados,
  } = useDashAdmin();

  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [selectedMentorado, setSelectedMentorado] = useState<MentoradoRow | null>(null);
  const [sortKey, setSortKey] = useState<string>("total_faturamento");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dash-admin-profiles"] });
    await queryClient.invalidateQueries({ queryKey: ["dash-admin-revenue"] });
    await queryClient.invalidateQueries({ queryKey: ["dash-admin-metrics-diarias"] });
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [queryClient]);

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const sorted = [...paginated].sort((a, b) => {
    const aVal = (a as any)[sortKey];
    const bVal = (b as any)[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dash Admin</h1>
            <p className="text-sm text-muted-foreground">
              Painel de acompanhamento · {allMentorados.length} mentorados
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
            Atualizado às {format(lastRefresh, "HH:mm")}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {/* Single unified period selector */}
          <Select
            value={filters.period}
            onValueChange={(v) => setFilters((f) => ({ ...f, period: v as any }))}
          >
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Block 1: KPIs */}
      <AdminKPIs kpis={kpis} isLoading={isLoading} />

      {/* Block 2: Smart Alerts */}
      <AdminAlerts
        expiring7d={kpis.expiring7d}
        inactive15d={kpis.inactive15d}
        neverRevenue={kpis.neverRevenue}
        setFilters={setFilters}
      />

      {/* Block 3: Charts */}
      <AdminCharts monthlyRevenue={monthlyRevenue} top5={top5} isLoading={isLoading} />

      {/* Block 4: Table filters (search, status, engagement only — no period) */}
      <AdminFilters filters={filters} setFilters={setFilters} />

      {/* Table toolbar */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setColumnSelectorOpen(true)}>
          <Columns3 className="mr-2 h-4 w-4" /> Colunas
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCSV(visibleColumns)}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <AdminTable
        data={sorted}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onSort={handleSort}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onRowClick={setSelectedMentorado}
        isLoading={isLoading}
      />

      <ColumnSelector
        open={columnSelectorOpen}
        onOpenChange={setColumnSelectorOpen}
        allColumns={allColumns}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        columnLabels={COLUMN_LABELS}
      />

      <MentoradoDetailModal
        mentorado={selectedMentorado}
        onClose={() => setSelectedMentorado(null)}
        columnLabels={COLUMN_LABELS}
      />
    </div>
  );
}
