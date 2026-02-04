import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  disabled?: boolean;
}

interface SelectedFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function DocumentUploader({ onUpload, isUploading, disabled }: DocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Tipo não suportado: ${extension}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo maior que 10MB";
    }
    
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        // Avoid duplicates
        if (!selectedFiles.some((sf) => sf.file.name === file.name)) {
          newFiles.push({ file, status: "pending" });
        }
      }
    });

    if (errors.length > 0) {
      setError(errors.join("\n"));
    } else {
      setError(null);
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
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
    addFiles(e.dataTransfer.files);
  }, [selectedFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ""; // Reset input to allow selecting same files again
    }
  }, [selectedFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const sf = selectedFiles[i];
      if (sf.status !== "pending") continue;

      // Update status to uploading
      setSelectedFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        await onUpload(sf.file);
        // Update status to done
        setSelectedFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        // Update status to error
        setSelectedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "error", error: err instanceof Error ? err.message : "Erro" }
              : f
          )
        );
      }
    }

    // Clear completed files after a short delay
    setTimeout(() => {
      setSelectedFiles((prev) => prev.filter((f) => f.status !== "done"));
    }, 1500);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setError(null);
  };

  const pendingCount = selectedFiles.filter((f) => f.status === "pending").length;
  const uploadingCount = selectedFiles.filter((f) => f.status === "uploading").length;

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragOver && "border-primary bg-primary/5",
            !isDragOver && "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((sf, index) => (
                  <div
                    key={`${sf.file.name}-${index}`}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-left text-sm",
                      sf.status === "done" && "bg-primary/10",
                      sf.status === "error" && "bg-destructive/10",
                      sf.status === "pending" && "bg-muted",
                      sf.status === "uploading" && "bg-primary/10"
                    )}
                  >
                    {sf.status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{sf.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(sf.file.size / 1024).toFixed(1)} KB
                        {sf.status === "done" && " • ✓ Enviado"}
                        {sf.status === "error" && ` • ${sf.error}`}
                      </p>
                    </div>
                    {sf.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isUploading || uploadingCount > 0}
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading || uploadingCount > 0 || pendingCount === 0}
                  className="gap-2"
                >
                  {uploadingCount > 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Enviar {pendingCount} {pendingCount === 1 ? "arquivo" : "arquivos"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste arquivos aqui</p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar múltiplos arquivos
                </p>
              </div>
              <input
                type="file"
                accept={ALLOWED_EXTENSIONS.join(",")}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={disabled}
                multiple
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild disabled={disabled}>
                  <span className="cursor-pointer">Selecionar arquivos</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground">
                Formatos: PDF, DOCX, TXT, MD • Máximo: 10MB por arquivo
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive text-center whitespace-pre-line">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
