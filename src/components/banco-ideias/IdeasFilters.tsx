import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TYPE_OPTIONS, CHANNEL_OPTIONS, OBJECTIVE_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from "./ideaConstants";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterChannel: string;
  onFilterChannelChange: (v: string) => void;
  filterObjective: string;
  onFilterObjectiveChange: (v: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (v: string) => void;
  filterResponsible: string;
  onFilterResponsibleChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  responsibles: string[];
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function IdeasFilters(props: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar título ou hook..."
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          className="pl-8 h-8 w-[200px] text-xs"
        />
      </div>
      <FilterSelect label="Tipo" value={props.filterType} onChange={props.onFilterTypeChange} options={TYPE_OPTIONS} />
      <FilterSelect label="Canal" value={props.filterChannel} onChange={props.onFilterChannelChange} options={CHANNEL_OPTIONS} />
      <FilterSelect label="Objetivo" value={props.filterObjective} onChange={props.onFilterObjectiveChange} options={OBJECTIVE_OPTIONS} />
      <FilterSelect label="Prioridade" value={props.filterPriority} onChange={props.onFilterPriorityChange} options={PRIORITY_OPTIONS} />
      <FilterSelect label="Status" value={props.filterStatus} onChange={props.onFilterStatusChange} options={STATUS_OPTIONS} />
      {props.responsibles.length > 0 && (
        <FilterSelect
          label="Responsável"
          value={props.filterResponsible}
          onChange={props.onFilterResponsibleChange}
          options={props.responsibles.map((r) => ({ value: r, label: r }))}
        />
      )}
      {props.hasFilters && (
        <Button variant="ghost" size="sm" onClick={props.onClearFilters} className="h-8 text-xs gap-1 text-muted-foreground">
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-[130px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
