import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { DashAdminFilters } from "@/hooks/useDashAdmin";

interface Props {
  filters: DashAdminFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashAdminFilters>>;
}

export function AdminFilters({ filters, setFilters }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as any }))}>
        <SelectTrigger className="w-40 h-9 text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="90">Últimos 90 dias</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="suspended">Suspenso</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
        </SelectContent>
      </Select>

      {filters.period === "custom" && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.customStart || ""}
            onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))}
            className="h-9 text-sm w-36"
          />
          <Input
            type="date"
            value={filters.customEnd || ""}
            onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))}
            className="h-9 text-sm w-36"
          />
        </div>
      )}
    </div>
  );
}
