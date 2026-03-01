import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import type { MentoradoRow } from "@/hooks/useDashAdmin";

interface Props {
  mentorado: MentoradoRow | null;
  onClose: () => void;
  columnLabels: Record<string, string>;
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key.includes("_at") || key === "created_at") {
    try { return format(parseISO(String(value)), "dd/MM/yyyy HH:mm"); } catch { return String(value); }
  }
  if (key.includes("faturamento") || key.includes("investimento") || key === "revenue_goal") {
    return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  return String(value);
}

export function MentoradoDetailModal({ mentorado, onClose, columnLabels }: Props) {
  if (!mentorado) return null;

  const entries = Object.entries(mentorado).filter(([k]) => k !== "id" && k !== "must_change_password");

  return (
    <Dialog open={!!mentorado} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mentorado.full_name || mentorado.email || "Mentorado"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between items-start gap-4 py-1.5 border-b border-border/30 last:border-0">
              <span className="text-xs font-medium text-muted-foreground shrink-0">
                {columnLabels[key] || key}
              </span>
              <span className="text-sm text-right">{formatValue(key, value)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
