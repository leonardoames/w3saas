import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    if (!code || !shop || !state) {
      toast({ title: "Erro", description: "Parâmetros inválidos no callback.", variant: "destructive" });
      navigate("/app/integracoes");
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await supabase.functions.invoke("shopify-oauth?action=callback", {
          body: { code, shop, state },
        });

        if (res.error) {
          throw new Error(res.error.message);
        }

        toast({ title: "Shopify conectada com sucesso!" });
      } catch (err: any) {
        console.error("Shopify callback error:", err);
        toast({ title: "Erro ao conectar Shopify", description: err.message, variant: "destructive" });
      } finally {
        setProcessing(false);
        navigate("/app/integracoes");
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">
          {processing ? "Conectando sua loja Shopify..." : "Redirecionando..."}
        </p>
      </div>
    </div>
  );
}
