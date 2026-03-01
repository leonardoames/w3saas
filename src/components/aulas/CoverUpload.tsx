import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CoverUploadProps {
  currentUrl?: string | null;
  onUrlChange: (url: string | null) => void;
  moduleId?: string;
}

export function CoverUpload({ currentUrl, onUrlChange, moduleId }: CoverUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Apenas imagens são permitidas.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "Imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${moduleId || crypto.randomUUID()}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("module-covers")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("module-covers")
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onUrlChange(publicUrl);

      toast({ title: "✅ Capa enviada!", description: "A capa foi salva com sucesso." });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Erro", description: "Não foi possível enviar a imagem.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUrlChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>Capa do Módulo (708×1494 recomendado)</Label>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center",
            "w-[80px] flex-shrink-0"
          )}
          style={{ aspectRatio: "708/1494" }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {uploading ? "Enviando..." : preview ? "Substituir" : "Upload"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Remover
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">Máx 2MB • JPG, PNG ou WebP</p>
        </div>
      </div>
    </div>
  );
}
