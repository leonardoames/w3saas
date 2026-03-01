import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plug, Unplug, ExternalLink, Loader2, RefreshCw, Copy, CheckCheck } from "lucide-react";

import shopeeLogo from "@/assets/platforms/shopee.png";
import nuvemshopLogo from "@/assets/platforms/nuvemshop.png";
import mercadoLivreLogo from "@/assets/platforms/mercado-livre.png";
import shopifyLogo from "@/assets/platforms/shopify.png";
import olistTinyLogo from "@/assets/platforms/olist-tiny.png";
import trayLogo from "@/assets/platforms/tray.png";
import lojaIntegradaLogo from "@/assets/platforms/loja-integrada.png";

const platformLogos: Record<string, string> = {
  nuvemshop: nuvemshopLogo,
  shopee: shopeeLogo,
  mercado_livre: mercadoLivreLogo,
  shopify: shopifyLogo,
  olist_tiny: olistTinyLogo,
  tray: trayLogo,
  loja_integrada: lojaIntegradaLogo,
};

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  docsUrl?: string;
  oauth?: boolean;
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
    fields: [],
    docsUrl: "https://open.shopee.com/documents",
    oauth: true,
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
    description: "Integre sua loja Shopify via OAuth. Crie um app no Shopify Partners e forneça as credenciais.",
    color: "bg-green-600",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Client ID do app no Shopify Partners" },
      { key: "client_secret", label: "Client Secret", placeholder: "Client Secret do app", type: "password" },
      { key: "shop_domain", label: "Domínio da Loja", placeholder: "sualoja.myshopify.com" },
    ],
    docsUrl: "https://integra-o-w3-app-142364288732.us-west1.run.app/",
    oauth: true,
  },
  {
    id: "olist_tiny",
    name: "Olist Tiny (ERP)",
    description: "Conecte ao Tiny ERP para importar pedidos, faturamento e dados de vendas automaticamente.",
    color: "bg-indigo-600",
    fields: [
      { key: "api_token", label: "Token da API", placeholder: "Cole seu token da API do Tiny aqui", type: "password" },
    ],
    docsUrl: "https://tiny.com.br/api-docs",
  },
  {
    id: "tray",
    name: "Tray",
    description: "Conecte sua loja Tray para importar pedidos, produtos e métricas de vendas automaticamente.",
    color: "bg-emerald-600",
    fields: [
      { key: "api_key", label: "Chave da API", placeholder: "Cole sua chave da API da Tray aqui", type: "password" },
      { key: "api_address", label: "Endereço da API", placeholder: "https://sualoja.commercesuite.com.br" },
    ],
    docsUrl: "https://developers.tray.com.br/",
  },
  {
    id: "loja_integrada",
    name: "Loja Integrada",
    description: "Integre com a Loja Integrada para acompanhar vendas, pedidos e performance da sua loja.",
    color: "bg-purple-600",
    fields: [
      { key: "api_key", label: "Chave da API", placeholder: "Cole sua chave da API aqui", type: "password" },
    ],
    docsUrl: "https://lojaintegrada.docs.apiary.io/",
  },
];

// Webhook base URL for LGPD
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const webhookUrls = {
  store_redact: `${SUPABASE_URL}/functions/v1/nuvemshop-webhooks?type=store_redact`,
  customers_redact: `${SUPABASE_URL}/functions/v1/nuvemshop-webhooks?type=customers_redact`,
  customers_data_request: `${SUPABASE_URL}/functions/v1/nuvemshop-webhooks?type=customers_data_request`,
};

export default function Integracoes() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialog, setConnectDialog] = useState<PlatformInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchIntegrations();
  }, [user]);

  const syncPlatform = async (platformId: string) => {
    setSyncing(platformId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await supabase.functions.invoke(`sync-${platformId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error) {
        toast({ title: "Erro na sincronização", description: res.error.message, variant: "destructive" });
      } else {
        toast({ title: "Sincronização concluída!", description: res.data?.message || "Dados atualizados." });
        fetchIntegrations();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from("user_integrations" as any)
      .select("id, user_id, platform, is_active, sync_status, last_sync_at, created_at, updated_at")
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

    // If this platform uses OAuth, redirect to authorization
    if (connectDialog.oauth) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        // Determine which edge function to call based on platform
        const oauthFunction = connectDialog.id === "shopee"
          ? "shopee-oauth?action=authorize"
          : "shopify-oauth?action=authorize";

        const body = connectDialog.id === "shopee"
          ? {}
          : {
              client_id: formData.client_id,
              client_secret: formData.client_secret,
              shop_domain: formData.shop_domain,
            };

        const res = await supabase.functions.invoke(oauthFunction, {
          headers: { Authorization: `Bearer ${token}` },
          body,
        });

        if (res.error) {
          toast({ title: "Erro", description: res.error.message, variant: "destructive" });
        } else if (res.data?.auth_url) {
          window.location.href = res.data.auth_url;
          return;
        }
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
      setSaving(false);
      return;
    }

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
    // For OAuth platforms with no fields, trigger OAuth directly
    if (platform.oauth && platform.fields.length === 0) {
      setConnectDialog(platform);
      // Trigger handleConnect immediately after state update
      setTimeout(() => {
        handleConnectOAuth(platform);
      }, 0);
      return;
    }

    // Never pre-fill credentials from existing data — credentials are write-only
    setFormData({});
    setConnectDialog(platform);
  };

  const handleConnectOAuth = async (platform: PlatformInfo) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const oauthFunction = platform.id === "shopee"
        ? "shopee-oauth?action=authorize"
        : "shopify-oauth?action=authorize";

      const res = await supabase.functions.invoke(oauthFunction, {
        headers: { Authorization: `Bearer ${token}` },
        body: {},
      });

      if (res.error) {
        toast({ title: "Erro", description: res.error.message, variant: "destructive" });
      } else if (res.data?.auth_url) {
        window.location.href = res.data.auth_url;
        return;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
    setConnectDialog(null);
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
                        variant="default"
                        size="sm"
                        onClick={() => syncPlatform(platform.id)}
                        disabled={syncing === platform.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${syncing === platform.id ? "animate-spin" : ""}`} />
                        {syncing === platform.id ? "Sincronizando..." : "Sincronizar"}
                      </Button>
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
                {/* LGPD Webhook URLs for Nuvemshop */}
                {platform.id === "nuvemshop" && connected && (
                  <div className="mt-3 p-3 rounded-lg border bg-muted/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">URLs Webhooks LGPD (cole no painel Nuvemshop)</p>
                    {Object.entries(webhookUrls).map(([key, url]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={url}
                          className="text-xs h-8 font-mono bg-background"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            setCopiedField(key);
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                        >
                          {copiedField === key ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
