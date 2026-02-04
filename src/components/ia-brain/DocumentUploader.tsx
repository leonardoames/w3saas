import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  disabled?: boolean;
}

export function DocumentUploader({ onUpload, isUploading, disabled }: DocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Tipo de arquivo não suportado. Use: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. Máximo: 10MB";
    }
    
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver && "border-primary bg-primary/5",
            !isDragOver && "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  disabled={isUploading}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Enviar documento
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste um arquivo aqui</p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
              </div>
              <input
                type="file"
                accept={ALLOWED_EXTENSIONS.join(",")}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={disabled}
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild disabled={disabled}>
                  <span className="cursor-pointer">Selecionar arquivo</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground">
                Formatos: PDF, DOCX, TXT, MD • Máximo: 10MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive text-center">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
