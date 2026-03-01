import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allColumns: string[];
  visibleColumns: string[];
  onColumnsChange: (cols: string[]) => void;
  columnLabels: Record<string, string>;
}

export function ColumnSelector({ open, onOpenChange, allColumns, visibleColumns, onColumnsChange, columnLabels }: Props) {
  const toggle = (col: string) => {
    if (visibleColumns.includes(col)) {
      onColumnsChange(visibleColumns.filter((c) => c !== col));
    } else {
      onColumnsChange([...visibleColumns, col]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Colunas visíveis</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {allColumns.map((col) => (
            <div key={col} className="flex items-center gap-3">
              <Checkbox
                id={`col-${col}`}
                checked={visibleColumns.includes(col)}
                onCheckedChange={() => toggle(col)}
              />
              <Label htmlFor={`col-${col}`} className="text-sm cursor-pointer">
                {columnLabels[col] || col}
              </Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
