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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="suspended">Suspenso</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
          <SelectItem value="expiring">Expirando</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.engagement} onValueChange={(v) => setFilters((f) => ({ ...f, engagement: v as any }))}>
        <SelectTrigger className="w-44 h-9 text-sm">
          <SelectValue placeholder="Engajamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active_recent">Ativos (7d)</SelectItem>
          <SelectItem value="inactive_15d">Inativos 15d+</SelectItem>
          <SelectItem value="never_logged">Nunca logaram</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
