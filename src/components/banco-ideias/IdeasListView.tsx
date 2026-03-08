import { useState } from "react";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Idea } from "@/pages/BancoDeIdeias";
import {
  TYPE_COLORS, PRIORITY_COLORS, STATUS_COLORS,
  getLabel, TYPE_OPTIONS, FORMAT_OPTIONS, CHANNEL_OPTIONS, OBJECTIVE_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "./ideaConstants";

interface Props {
  ideas: Idea[];
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
}

export function IdeasListView({ ideas, onEdit, onDelete }: Props) {
  const [page, setPage] = useState(0);
  const perPage = 20;
  const totalPages = Math.ceil(ideas.length / perPage);
  const paginated = ideas.slice(page * perPage, (page + 1) * perPage);

  if (ideas.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ideia encontrada com esses filtros.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Título</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Formato</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Canal</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Objetivo</TableHead>
              <TableHead className="text-xs hidden xl:table-cell">Hook</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Responsável</TableHead>
              <TableHead className="text-xs">Prioridade</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Entrega</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((idea) => (
              <TableRow key={idea.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onEdit(idea)}>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">{idea.title}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[idea.type] || ""}`}>{getLabel(TYPE_OPTIONS, idea.type)}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{getLabel(FORMAT_OPTIONS, idea.format)}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{getLabel(CHANNEL_OPTIONS, idea.channel)}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{getLabel(OBJECTIVE_OPTIONS, idea.objective)}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{idea.hook || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{idea.responsible || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[idea.priority] || ""}`}>{getLabel(PRIORITY_OPTIONS, idea.priority)}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[idea.status] || ""}`}>{getLabel(STATUS_OPTIONS, idea.status)}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {idea.due_date ? new Date(idea.due_date).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(idea); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="text-xs h-7">Anterior</Button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="text-xs h-7">Próxima</Button>
        </div>
      )}
    </div>
  );
}
