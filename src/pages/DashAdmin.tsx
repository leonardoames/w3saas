import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useDashAdmin, MentoradoRow } from "@/hooks/useDashAdmin";
import { AdminKPIs } from "@/components/dash-admin/AdminKPIs";
import { AdminCharts } from "@/components/dash-admin/AdminCharts";
import { AdminFilters } from "@/components/dash-admin/AdminFilters";
import { AdminTable } from "@/components/dash-admin/AdminTable";
import { MentoradoDetailModal } from "@/components/dash-admin/MentoradoDetailModal";
import { ColumnSelector } from "@/components/dash-admin/ColumnSelector";
import { Button } from "@/components/ui/button";
import { Download, Columns3, Loader2, ShieldAlert } from "lucide-react";

const DEFAULT_COLUMNS = [
  "full_name",
  "email",
  "access_status",
  "plan_type",
  "created_at",
  "last_login_at",
  "total_faturamento",
];

const COLUMN_LABELS: Record<string, string> = {
  user_id: "ID",
  email: "E-mail",
  full_name: "Nome",
  access_status: "Status",
  plan_type: "Plano",
  is_mentorado: "Mentorado",
  is_w3_client: "Cliente W3",
  access_expires_at: "Expiração",
  created_at: "Cadastro",
  last_login_at: "Último Login",
  revenue_goal: "Meta Faturamento",
  total_faturamento: "Faturamento Total",
  total_sessoes: "Sessões Total",
  total_investimento: "Investimento Total",
  total_pedidos: "Pedidos Total",
  updated_at: "Atualização",
};

export default function DashAdmin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const {
    paginated, page, setPage, totalPages, filters, setFilters,
    kpis, chartData, allColumns, exportCSV, isLoading, mentorados,
  } = useDashAdmin();

  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [selectedMentorado, setSelectedMentorado] = useState<MentoradoRow | null>(null);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  // Sort paginated data
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dash Admin</h1>
          <p className="text-sm text-muted-foreground">
            Painel de acompanhamento dos mentorados ({mentorados.length} registros)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setColumnSelectorOpen(true)}>
            <Columns3 className="mr-2 h-4 w-4" /> Colunas
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(visibleColumns)}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <AdminKPIs kpis={kpis} isLoading={isLoading} />

      <AdminFilters filters={filters} setFilters={setFilters} />

      <AdminCharts chartData={chartData} isLoading={isLoading} />

      <AdminTable
        data={sorted}
        visibleColumns={visibleColumns}
        columnLabels={COLUMN_LABELS}
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
