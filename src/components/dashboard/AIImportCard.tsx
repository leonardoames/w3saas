import { BrainCircuit, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AIImportCardProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processing: boolean;
}

export function AIImportCard({ onUpload, processing }: AIImportCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <BrainCircuit className="h-8 w-8 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Importação Inteligente (IA)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Envie qualquer planilha da Shopee, Amazon, Mercado Livre, Nuvemshop, etc. 
              A IA irá identificar a plataforma e extrair os dados automaticamente.
            </p>
          </div>
          
          <div>
            <Label htmlFor="ai-upload" className="cursor-pointer">
              <Button 
                variant="default" 
                size="sm" 
                disabled={processing}
                asChild
              >
                <span className="flex items-center gap-2">
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Selecionar Arquivo (CSV/XLSX)
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <Input 
              id="ai-upload" 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              onChange={onUpload} 
              disabled={processing}
              className="hidden" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
