import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BulkRow {
  data: string;
  faturamento: string;
  sessoes: string;
  investimento_trafego: string;
  vendas_quantidade: string;
  vendas_valor: string;
}

interface BulkEntryCardProps {
  rows: BulkRow[];
  onRowsChange: (rows: BulkRow[]) => void;
  onSave: () => void;
  saving: boolean;
}

export function BulkEntryCard({ rows, onRowsChange, onSave, saving }: BulkEntryCardProps) {
  const updateRow = (index: number, field: keyof BulkRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    onRowsChange(newRows);
  };

  const addRow = () => {
    onRowsChange([
      ...rows,
      { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    onRowsChange(newRows);
  };

  const hasValidData = rows.some((row) => String(row.data || "").trim().length > 0);

  return (
    <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-medium text-foreground">Adicionar múltiplos dias manualmente</h3>
      
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Dia {i + 1}</span>
              {rows.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={row.data}
                  onChange={(e) => updateRow(i, "data", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Faturamento</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={row.faturamento}
                  onChange={(e) => updateRow(i, "faturamento", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Sessões</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={row.sessoes}
                  onChange={(e) => updateRow(i, "sessoes", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Investimento</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={row.investimento_trafego}
                  onChange={(e) => updateRow(i, "investimento_trafego", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Vendas</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={row.vendas_quantidade}
                  onChange={(e) => updateRow(i, "vendas_quantidade", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={row.vendas_valor}
                  onChange={(e) => updateRow(i, "vendas_valor", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={addRow} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar linha
        </Button>
        <Button 
          onClick={onSave} 
          disabled={saving || !hasValidData} 
          size="sm"
        >
          {saving ? "Salvando..." : "Salvar Lote"}
        </Button>
      </div>
    </div>
  );
}
