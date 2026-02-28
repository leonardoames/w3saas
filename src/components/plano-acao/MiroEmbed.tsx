import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Map } from "lucide-react";

const MIRO_PREFIX = "https://miro.com/app/live-embed/";

export function MiroEmbed() {
  const { user } = useAuth();
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchEmbed = async () => {
      const { data } = await supabase
        .from("miro_embeds")
        .select("embed_src")
        .eq("user_id", user.id)
        .maybeSingle();

      setEmbedSrc(data?.embed_src ?? null);
      setLoading(false);
    };

    fetchEmbed();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!embedSrc || !embedSrc.startsWith(MIRO_PREFIX)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Map className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            Mapa mental ainda não disponível
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu tutor irá adicionar o mapa mental em breve
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border">
      <iframe
        src={embedSrc}
        className="w-full"
        style={{ height: "600px" }}
        allow="fullscreen; clipboard-read; clipboard-write"
        allowFullScreen
      />
    </div>
  );
}
