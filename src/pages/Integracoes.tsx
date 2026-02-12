import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plug, Unplug, ExternalLink, Loader2 } from "lucide-react";

import shopeeLogo from "@/assets/platforms/shopee.png";
import nuvemshopLogo from "@/assets/platforms/nuvemshop.png";
import mercadoLivreLogo from "@/assets/platforms/mercado-livre.png";
import shopifyLogo from "@/assets/platforms/shopify.png";

const platformLogos: Record<string, string> = {
  nuvemshop: nuvemshopLogo,
  shopee: shopeeLogo,
  mercado_livre: mercadoLivreLogo,
  shopify: shopifyLogo,
};

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  docsUrl?: string;
}

const platforms: PlatformInfo[] = [
  {
    id: "nuvemshop",
    name: "Nuvemshop",
    description: "Conecte sua loja Nuvemshop para importar pedidos, produtos e métricas automaticamente.",
    color: "bg-blue-600",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "Cole seu access token aqui" },
      { key: "store_id", label: "Store ID", placeholder: "ID da sua loja" },
    ],
    docsUrl: "https://tiendanube.github.io/api-documentation/intro",
  },
  {
    id: "shopee",
    name: "Shopee",
    description: "Integre com a Shopee para acompanhar vendas, métricas e gastos com Shopee Ads.",
    color: "bg-orange-500",
    fields: [
      { key: "partner_id", label: "Partner ID", placeholder: "Seu Partner ID" },
      { key: "partner_key", label: "Partner Key", placeholder: "Sua Partner Key", type: "password" },
      { key: "shop_id", label: "Shop ID", placeholder: "ID da sua loja" },
    ],
    docsUrl: "https://open.shopee.com/documents",
  },
  {
    id: "mercado_livre",
    name: "Mercado Livre",
    description: "Conecte ao Mercado Livre para importar vendas e acompanhar performance.",
    color: "bg-yellow-500",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "Seu access token" },
      { key: "seller_id", label: "Seller ID", placeholder: "ID do vendedor" },
    ],
    docsUrl: "https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Integre sua loja Shopify para sincronizar pedidos e métricas de vendas.",
    color: "bg-green-600",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "Seu Admin API access token" },
      { key: "store_url", label: "URL da Loja", placeholder: "sualoja.myshopify.com" },
    ],
    docsUrl: "https://shopify.dev/docs/api",
  },
];

export default function Integracoes() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialog, setConnectDialog] = useState<PlatformInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) fetchIntegrations();
  }, [user]);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from("user_integrations" as any)
      .select("*")
      .eq("user_id", user!.id);

    if (!error && data) {
      const map: Record<string, any> = {};
      (data as any[]).forEach((i) => (map[i.platform] = i));
      setIntegrations(map);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!connectDialog || !user) return;
    setSaving(true);

    const existing = integrations[connectDialog.id];
    
    if (existing) {
      const { error } = await supabase
        .from("user_integrations" as any)
        .update({ credentials: formData, is_active: true, sync_status: "connected" } as any)
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Integração atualizada!" });
      }
    } else {
      const { error } = await supabase
        .from("user_integrations" as any)
        .insert({ user_id: user.id, platform: connectDialog.id, credentials: formData, is_active: true, sync_status: "connected" } as any);
      if (error) {
        toast({ title: "Erro ao conectar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `${connectDialog.name} conectada com sucesso!` });
      }
    }

    setSaving(false);
    setConnectDialog(null);
    setFormData({});
    fetchIntegrations();
  };

  const handleDisconnect = async (platformId: string) => {
    const integration = integrations[platformId];
    if (!integration) return;

    const { error } = await supabase
      .from("user_integrations" as any)
      .update({ is_active: false, sync_status: "disconnected" } as any)
      .eq("id", integration.id);

    if (error) {
      toast({ title: "Erro ao desconectar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Integração desconectada" });
      fetchIntegrations();
    }
  };

  const openConnectDialog = (platform: PlatformInfo) => {
    const existing = integrations[platform.id];
    if (existing?.credentials) {
      const creds: Record<string, string> = {};
      platform.fields.forEach((f) => (creds[f.key] = existing.credentials[f.key] || ""));
      setFormData(creds);
    } else {
      setFormData({});
    }
    setConnectDialog(platform);
  };

  const isConnected = (platformId: string) => {
    const i = integrations[platformId];
    return i?.is_active && i?.sync_status === "connected";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">
          Conecte suas plataformas de e-commerce para sincronizar dados automaticamente com o Dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const connected = isConnected(platform.id);
          return (
            <Card key={platform.id} className={connected ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={platformLogos[platform.id]} alt={platform.name} className="w-11 h-11 object-contain" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                    </div>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Conectada" : "Desconectada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{platform.description}</CardDescription>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConnectDialog(platform)}
                      >
                        <Plug className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnect(platform.id)}
                      >
                        <Unplug className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => openConnectDialog(platform)}>
                      <Plug className="h-4 w-4 mr-1" />
                      Conectar
                    </Button>
                  )}
                  {platform.docsUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Docs
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {connectDialog && (integrations[connectDialog.id] ? "Editar" : "Conectar")} {connectDialog?.name}
            </DialogTitle>
            <DialogDescription>
              Insira as credenciais da API para conectar sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {connectDialog?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConnect} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {integrations[connectDialog?.id || ""] ? "Atualizar" : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
