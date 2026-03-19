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
import { Plug, Unplug, ExternalLink, Loader2, RefreshCw, Copy, CheckCheck, Info, Clock, AlertTriangle } from "lucide-react";

import shopeeLogo from "@/assets/platforms/shopee.png";
import nuvemshopLogo from "@/assets/platforms/nuvemshop.png";
import mercadoLivreLogo from "@/assets/platforms/mercado-livre.png";
import shopifyLogo from "@/assets/platforms/shopify.png";
import olistTinyLogo from "@/assets/platforms/olist-tiny.png";
import trayLogo from "@/assets/platforms/tray.png";
import lojaIntegradaLogo from "@/assets/platforms/loja-integrada.png";
import bagyLogo from "@/assets/platforms/bagy.png";

const platformLogos: Record<string, string> = {
  nuvemshop: nuvemshopLogo,
  shopee: shopeeLogo,
  shopee_ads: shopeeLogo,
  mercado_livre: mercadoLivreLogo,
  shopify: shopifyLogo,
  olist_tiny: olistTinyLogo,
  tray: trayLogo,
  loja_integrada: lojaIntegradaLogo,
  bagy: bagyLogo,
};

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type?: string; hint?: string }[];
  docsUrl?: string;
  oauth?: boolean;
  setupHint?: string;
  syncTags?: string[];
  comingSoon?: boolean;
}

const platforms: PlatformInfo[] = [
  {
    id: "nuvemshop",
    name: "Nuvemshop",
    description: "Importa pedidos pagos dos últimos 90 dias automaticamente.",
    color: "bg-blue-600",
    syncTags: ["Pedidos", "Faturamento"],
    fields: [
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Cole seu access token aqui",
        hint: "No painel Nuvemshop: Meus aplicativos → Criar aplicativo → copie o Access Token gerado.",
      },
      {
        key: "store_id",
        label: "Store ID",
        placeholder: "Ex: 1234567",
        hint: "Número de 7 dígitos visível na URL do painel: minha.nuvemshop.com.br/[store_id]/...",
      },
    ],
    docsUrl: "https://tiendanube.github.io/api-documentation/intro",
  },
  {
    id: "shopee",
    name: "Shopee",
    description: "Importa pedidos e faturamento da sua loja Shopee via OAuth.",
    color: "bg-orange-500",
    syncTags: ["Pedidos", "Faturamento"],
    fields: [],
    docsUrl: "https://open.shopee.com/documents",
    oauth: true,
  },
  {
    id: "shopee_ads",
    name: "Shopee ADS",
    description: "Importa investimento em anúncios e cliques do app de Marketing da Shopee.",
    color: "bg-orange-600",
    syncTags: ["Investimento", "Cliques"],
    fields: [],
    docsUrl: "https://open.shopee.com/documents",
    oauth: true,
  },
  {
    id: "mercado_livre",
    name: "Mercado Livre",
    description: "Conecte sua conta Mercado Livre via OAuth. Sincronização automática em breve.",
    color: "bg-yellow-500",
    syncTags: ["Em breve"],
    fields: [],
    docsUrl: "https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br",
    oauth: true,
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Importa pedidos e faturamento da sua loja Shopify via OAuth.",
    color: "bg-green-600",
    syncTags: ["Pedidos", "Faturamento"],
    setupHint: "Você precisará criar um app privado no Shopify Partners. Consulte a documentação para o passo a passo completo.",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Client ID do app no Shopify Partners" },
      { key: "client_secret", label: "Client Secret", placeholder: "Client Secret do app", type: "password" },
      {
        key: "shop_domain",
        label: "Domínio da Loja",
        placeholder: "sualoja.myshopify.com",
        hint: "Use o domínio .myshopify.com, não o domínio customizado.",
      },
    ],
    docsUrl: "https://integra-o-w3-app-142364288732.us-west1.run.app/",
    oauth: true,
  },
  {
    id: "olist_tiny",
    name: "Olist Tiny (ERP)",
    description: "Importa pedidos e faturamento do Tiny ERP automaticamente.",
    color: "bg-indigo-600",
    syncTags: ["Pedidos", "Faturamento"],
    fields: [
      {
        key: "api_token",
        label: "Token da API",
        placeholder: "Cole seu token da API do Tiny aqui",
        type: "password",
        hint: "No Tiny ERP: Configurações → Integrações → API → copie o Token de acesso.",
      },
    ],
    docsUrl: "https://tiny.com.br/api-docs",
  },
  {
    id: "tray",
    name: "Tray",
    description: "Salve suas credenciais Tray. Sincronização automática em breve.",
    color: "bg-emerald-600",
    syncTags: ["Em breve"],
    comingSoon: true,
    fields: [
      { key: "api_key", label: "Chave da API", placeholder: "Cole sua chave da API da Tray aqui", type: "password" },
      {
        key: "api_address",
        label: "Endereço da API",
        placeholder: "https://sualoja.commercesuite.com.br",
        hint: "URL base da sua loja no formato https://sualoja.commercesuite.com.br",
      },
    ],
    docsUrl: "https://developers.tray.com.br/",
  },
  {
    id: "loja_integrada",
    name: "Loja Integrada",
    description: "Salve suas credenciais Loja Integrada. Sincronização automática em breve.",
    color: "bg-purple-600",
    syncTags: ["Em breve"],
    comingSoon: true,
    fields: [
      {
        key: "api_key",
        label: "Chave da API",
        placeholder: "Cole sua chave da API aqui",
        type: "password",
        hint: "No painel Loja Integrada: Configurações → API → Chave de API.",
      },
    ],
    docsUrl: "https://lojaintegrada.docs.apiary.io/",
  },
  {
    id: "bagy",
    name: "Bagy",
    description: "Salve suas credenciais Bagy. Sincronização automática em breve.",
    color: "bg-pink-600",
    syncTags: ["Em breve"],
    comingSoon: true,
    fields: [
      {
        key: "api_key",
        label: "Chave da API",
        placeholder: "Cole sua chave da API da Bagy aqui",
        type: "password",
        hint: "No painel Bagy: Configurações → Integrações → API → copie sua chave.",
      },
    ],
    docsUrl: "https://bagypro.com/desenvolvedores",
  },
];

// Platforms that have a working sync edge function
const SYNCABLE_PLATFORMS = new Set(["nuvemshop", "shopee", "shopee_ads", "shopify", "olist_tiny", "mercado_livre"]);

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

  // Handle OAuth callback feedback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const platform = params.get("platform");
    const error = params.get("error");

    if (status === "success" && platform) {
      toast({ title: "Integração conectada!", description: `${platform} conectado com sucesso.` });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (error) {
      toast({ title: "Erro na integração", description: `Erro: ${error}`, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user) fetchIntegrations();
  }, [user]);

  const syncPlatform = async (platformId: string) => {
    setSyncing(platformId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const syncFnName = platformId === 'shopee_ads' ? 'sync-shopee-ads' : `sync-${platformId}`;
      const res = await supabase.functions.invoke(syncFnName, {
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
          : connectDialog.id === "shopee_ads"
          ? "shopee-ads-oauth?action=authorize"
          : connectDialog.id === "mercado_livre"
          ? "mercado-livre-oauth?action=authorize"
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
        : platform.id === "shopee_ads"
        ? "shopee-ads-oauth?action=authorize"
        : platform.id === "mercado_livre"
        ? "mercado-livre-oauth?action=authorize"
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
        <h1 className="page-title">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte suas plataformas de e-commerce para sincronizar dados automaticamente com o Dashboard.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Como funciona a sincronização</p>
          <p>As integrações importam <strong>pedidos e faturamento</strong> automaticamente. Para ter <strong>investimento em tráfego e sessões</strong> no dashboard, conecte também o <strong>Shopee ADS</strong> ou preencha os dados manualmente no Acompanhamento Diário.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const connected = isConnected(platform.id);
          const integration = integrations[platform.id];
          const lastSync = integration?.last_sync_at;
          const lastSyncLabel = lastSync
            ? (() => {
                const diff = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
                if (diff < 2) return "Sincronizado agora";
                if (diff < 60) return `Há ${diff} min`;
                const h = Math.floor(diff / 60);
                if (h < 24) return `Há ${h}h`;
                return `Há ${Math.floor(h / 24)}d`;
              })()
            : connected ? "Nunca sincronizado" : null;

          return (
            <Card key={platform.id} className={connected ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={platformLogos[platform.id]} alt={platform.name} className="w-11 h-11 object-contain" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      {platform.syncTags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {platform.syncTags.map(tag => (
                            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              tag === "Em breve"
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Conectada" : "Desconectada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>{platform.description}</CardDescription>

                {/* Last sync time */}
                {lastSyncLabel && (
                  <div className={`flex items-center gap-1.5 text-xs ${lastSync ? "text-muted-foreground" : "text-amber-600 dark:text-amber-500"}`}>
                    <Clock className="h-3 w-3" />
                    {lastSyncLabel}
                  </div>
                )}

                {/* Coming soon warning */}
                {platform.comingSoon && connected && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    Credenciais salvas. Sincronização automática em desenvolvimento.
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {connected ? (
                    <>
                      {SYNCABLE_PLATFORMS.has(platform.id) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => syncPlatform(platform.id)}
                          disabled={syncing === platform.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncing === platform.id ? "animate-spin" : ""}`} />
                          {syncing === platform.id ? "Sincronizando..." : "Sincronizar"}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openConnectDialog(platform)}>
                        <Plug className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDisconnect(platform.id)}>
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
                  <div className="mt-1 p-3 rounded-lg border bg-muted/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">URLs Webhooks LGPD (cole no painel Nuvemshop)</p>
                    {Object.entries(webhookUrls).map(([key, url]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input readOnly value={url} className="text-xs h-8 font-mono bg-background" />
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                          onClick={() => { navigator.clipboard.writeText(url); setCopiedField(key); setTimeout(() => setCopiedField(null), 2000); }}
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
            {connectDialog?.setupHint && (
              <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <span>{connectDialog.setupHint}</span>
              </div>
            )}
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
                {field.hint && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    {field.hint}
                  </p>
                )}
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
