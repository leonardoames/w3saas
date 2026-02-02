import { useState } from "react";
import { BrainCircuit, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlatformSelect } from "./PlatformSelect";
import { PlatformType } from "@/lib/platformConfig";

interface AIImportCardProps {
  onUpload: (file: File, platform: PlatformType) => void;
  processing: boolean;
}

export function AIImportCard({ onUpload, processing }: AIImportCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("shopee");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (selectedFile && selectedPlatform) {
      onUpload(selectedFile, selectedPlatform);
      setDialogOpen(false);
      setSelectedFile(null);
    }
  };

  const handleOpenDialog = () => {
    setSelectedFile(null);
    setDialogOpen(true);
  };

  return (
    <>
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
                A IA irá identificar e extrair os dados automaticamente.
              </p>
            </div>
            
            <Button 
              variant="default" 
              size="sm" 
              disabled={processing}
              onClick={handleOpenDialog}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando com IA...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Arquivo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Configurar Importação IA
            </DialogTitle>
            <DialogDescription>
              Selecione a plataforma de origem e envie o arquivo para processamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma de Origem</Label>
              <PlatformSelect
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Selecione a plataforma de onde o relatório foi exportado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo (CSV ou XLSX)</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="file-upload" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "Clique para selecionar"}
                    </span>
                  </div>
                </Label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={handleFileSelect}
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedFile || !selectedPlatform}
            >
              <BrainCircuit className="h-4 w-4 mr-2" />
              Processar com IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
