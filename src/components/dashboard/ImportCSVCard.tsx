import { FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportCSVCardProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportCSVCard({ onUpload }: ImportCSVCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
      <h3 className="text-sm font-medium text-foreground mb-4">Importar CSV de Métricas</h3>
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Label htmlFor="csv-upload" className="cursor-pointer block">
          <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-foreground mb-2">Clique para selecionar arquivo CSV</p>
          <code className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded block mt-2">
            data,faturamento,sessoes,investimento,vendas_quantidade,vendas_valor
          </code>
        </Label>
        <Input 
          id="csv-upload" 
          type="file" 
          accept=".csv" 
          onChange={onUpload} 
          className="hidden" 
        />
      </div>
    </div>
  );
}
