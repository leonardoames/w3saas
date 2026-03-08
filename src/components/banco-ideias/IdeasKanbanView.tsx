import { useRef } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Idea } from "@/pages/BancoDeIdeias";
import {
  STATUS_OPTIONS, FORMAT_OPTIONS, CHANNEL_OPTIONS, PRIORITY_BORDER,
  getLabel, TYPE_COLORS,
} from "./ideaConstants";
import { cn } from "@/lib/utils";

interface Props {
  ideas: Idea[];
  onEdit: (idea: Idea) => void;
  onStatusChange: (id: string, newStatus: string) => void;
}

const KANBAN_COLUMNS = STATUS_OPTIONS.map((s) => s.value);

const COLUMN_HEADER_COLORS: Record<string, string> = {
  ideia: "text-muted-foreground",
  em_producao: "text-blue-400",
  aprovacao: "text-yellow-400",
  agendado: "text-purple-400",
  publicado: "text-green-400",
  arquivado: "text-zinc-500",
};

export function IdeasKanbanView({ ideas, onEdit, onStatusChange }: Props) {
  const dragRef = useRef<{ id: string; fromStatus: string } | null>(null);

  const handleDragStart = (id: string, status: string) => {
    dragRef.current = { id, fromStatus: status };
  };

  const handleDrop = (toStatus: string) => {
    if (dragRef.current && dragRef.current.fromStatus !== toStatus) {
      onStatusChange(dragRef.current.id, toStatus);
    }
    dragRef.current = null;
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {KANBAN_COLUMNS.map((status) => {
        const columnIdeas = ideas.filter((i) => i.status === status);
        const label = getLabel(STATUS_OPTIONS, status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-[260px] rounded-xl border border-border bg-card/50 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status)}
          >
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className={cn("text-xs font-semibold", COLUMN_HEADER_COLORS[status])}>{label}</span>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{columnIdeas.length}</span>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[60vh]">
              {columnIdeas.map((idea) => (
                <KanbanCard key={idea.id} idea={idea} onEdit={onEdit} onDragStart={handleDragStart} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ idea, onEdit, onDragStart }: { idea: Idea; onEdit: (i: Idea) => void; onDragStart: (id: string, status: string) => void }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(idea.id, idea.status)}
      onClick={() => onEdit(idea)}
      className={cn(
        "rounded-[10px] p-3.5 cursor-pointer transition-colors border border-[#222222] border-l-[3px] bg-[#111111] hover:border-primary/30",
        PRIORITY_BORDER[idea.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 flex-1">{idea.title}</h4>
        {idea.potential_score && (
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("h-2.5 w-2.5", i < (idea.potential_score || 0) ? "fill-yellow-400 text-yellow-400" : "text-zinc-700")} />
            ))}
          </div>
        )}
      </div>
      {idea.hook && (
        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{idea.hook}</p>
      )}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", TYPE_COLORS[idea.type])}>{getLabel(FORMAT_OPTIONS, idea.format)}</Badge>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{getLabel(CHANNEL_OPTIONS, idea.channel)}</Badge>
      </div>
      {idea.responsible && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold">
            {idea.responsible.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-muted-foreground">{idea.responsible}</span>
        </div>
      )}
    </div>
  );
}
