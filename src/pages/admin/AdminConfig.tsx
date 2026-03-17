import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload } from "lucide-react";

export default function AdminConfig() {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle();
    setLogoUrl(data?.value ?? null);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("svg") && !file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Use um arquivo SVG ou imagem.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("app-assets").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: settingsError } = await supabase
        .from("app_settings" as any)
        .upsert({ key: "logo_url", value: publicUrl } as any, { onConflict: "key" });

      if (settingsError) throw settingsError;

      setLogoUrl(publicUrl);
      toast({ title: "Logo atualizado!", description: "A logo já está visível na sidebar." });
    } catch (err: any) {
      toast({ title: "Erro ao fazer upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await supabase.from("app_settings" as any).delete().eq("key", "logo_url");
      setLogoUrl(null);
      toast({ title: "Logo removido", description: "O texto padrão voltará a aparecer." });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">Personalizações gerais do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logo da Sidebar</CardTitle>
            <CardDescription>
              Substitui o texto "W3 SaaS" no canto superior esquerdo. Recomendado: SVG horizontal com fundo transparente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-16 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : logoUrl ? (
              <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                <img src={logoUrl} alt="Logo atual" className="h-10 max-w-[180px] object-contain" />
                <span className="text-sm text-muted-foreground flex-1">Logo atual</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="p-3 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                Nenhuma logo configurada — exibindo texto "W3 SaaS"
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".svg,image/svg+xml,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {logoUrl ? "Trocar logo" : "Fazer upload da logo"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
