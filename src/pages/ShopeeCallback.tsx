import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ShopeeCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const shop_id = searchParams.get("shop_id");
    const state = searchParams.get("state");

    if (!code || !shop_id || !state) {
      toast({ title: "Erro", description: "Parâmetros inválidos no callback.", variant: "destructive" });
      navigate("/app/integracoes");
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await supabase.functions.invoke("shopee-oauth?action=callback", {
          body: { code, shop_id, state },
        });

        if (res.error) {
          throw new Error(res.error.message);
        }

        toast({ title: "Shopee conectada com sucesso!" });
      } catch (err: any) {
        console.error("Shopee callback error:", err);
        toast({ title: "Erro ao conectar Shopee", description: err.message, variant: "destructive" });
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
          {processing ? "Conectando sua loja Shopee..." : "Redirecionando..."}
        </p>
      </div>
    </div>
  );
}
