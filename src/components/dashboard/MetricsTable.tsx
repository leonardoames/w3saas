import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, ChevronUp, ChevronDown, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

interface MetricData {
  data: string;
  faturamento: number;
  sessoes: number;
  investimento_trafego: number;
  vendas_quantidade: number;
  vendas_valor: number;
}

interface MetricsTableProps {
  metrics: MetricData[];
  onEdit: (metric: MetricData) => void;
}

type SortKey = "data" | "faturamento" | "sessoes" | "investimento_trafego" | "vendas_quantidade" | "vendas_valor" | "roas" | "ticket";
type SortOrder = "asc" | "desc";

export function MetricsTable({ metrics, onEdit }: MetricsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const calculateRoas = (m: MetricData) => m.investimento_trafego > 0 ? m.faturamento / m.investimento_trafego : 0;
  const calculateTicket = (m: MetricData) => m.vendas_quantidade > 0 ? m.faturamento / m.vendas_quantidade : 0;

  const filteredAndSortedMetrics = useMemo(() => {
    let result = [...metrics];
    
    if (searchTerm) {
      result = result.filter(m => 
        format(parseISO(m.data), "dd/MM/yyyy").includes(searchTerm) ||
        m.data.includes(searchTerm)
      );
    }

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortKey) {
        case "data":
          return sortOrder === "asc" 
            ? a.data.localeCompare(b.data) 
            : b.data.localeCompare(a.data);
        case "roas":
          aVal = calculateRoas(a);
          bVal = calculateRoas(b);
          break;
        case "ticket":
          aVal = calculateTicket(a);
          bVal = calculateTicket(b);
          break;
        default:
          aVal = a[sortKey] as number;
          bVal = b[sortKey] as number;
      }
      
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [metrics, searchTerm, sortKey, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedMetrics.length / itemsPerPage);
  const paginatedMetrics = filteredAndSortedMetrics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns: { key: SortKey; label: string }[] = [
    { key: "data", label: "Data" },
    { key: "faturamento", label: "Faturamento" },
    { key: "sessoes", label: "Sessões" },
    { key: "investimento_trafego", label: "Investimento" },
    { key: "vendas_quantidade", label: "Vendas" },
    { key: "vendas_valor", label: "Valor Vendas" },
    { key: "roas", label: "ROAS" },
    { key: "ticket", label: "Ticket" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por data..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead 
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer hover:bg-muted transition-colors text-xs font-medium"
                >
                  <div className="flex items-center">
                    {col.label}
                    <SortIcon columnKey={col.key} />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-xs font-medium w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMetrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedMetrics.map((m) => (
                <TableRow key={m.data} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-sm font-medium">{format(parseISO(m.data), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-sm">R$ {m.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm">{m.sessoes.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-sm">R$ {m.investimento_trafego.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm">{m.vendas_quantidade}</TableCell>
                  <TableCell className="text-sm">R$ {m.vendas_valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm font-medium">{calculateRoas(m).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">R$ {calculateTicket(m).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(m)} className="h-8 w-8 p-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
