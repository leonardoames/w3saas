import { FileUp, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportFileCardProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportCSVCard({ onUpload }: ImportFileCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
      <h3 className="text-sm font-medium text-foreground mb-4">Importar Métricas (CSV ou Excel)</h3>
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Label htmlFor="file-upload" className="cursor-pointer block">
          <div className="flex justify-center gap-2 mb-4">
            <FileUp className="h-10 w-10 text-muted-foreground" />
            <FileSpreadsheet className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-2">Clique para selecionar arquivo CSV ou XLSX</p>
          <code className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded block mt-2">
            data,faturamento,sessoes,investimento,vendas_quantidade,vendas_valor
          </code>
        </Label>
        <Input 
          id="file-upload" 
          type="file" 
          accept=".csv,.xlsx,.xls" 
          onChange={onUpload} 
          className="hidden" 
        />
      </div>
    </div>
  );
}
