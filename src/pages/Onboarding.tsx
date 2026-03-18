import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Store, User, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

const NICHOS = [
  "Moda", "Beleza", "Tecnologia", "Casa & Decoração", "Saúde & Bem-estar",
  "Alimentos & Bebidas", "Esportes", "Pet", "Infantil", "Joias & Acessórios",
  "Papelaria", "Outro"
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"type" | "contact" | "details">("type");
  const [isEcommerce, setIsEcommerce] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Contact fields (all users)
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");

  // Ecommerce form fields
  const [website, setWebsite] = useState("");
  const [nicho, setNicho] = useState("");
  const [instagram, setInstagram] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aparecerCatalogo, setAparecerCatalogo] = useState(false);

  // Store links
  const [lojaShopeeUrl, setLojaShopeeUrl] = useState("");
  const [lojaMercadoLivreUrl, setLojaMercadoLivreUrl] = useState("");
  const [lojaSheinUrl, setLojaSheinUrl] = useState("");
  const [lojaTemuUrl, setLojaTemuUrl] = useState("");

  const handleTypeSelection = (ecommerce: boolean) => {
    setIsEcommerce(ecommerce);
    setStep("contact");
  };

  const handleContactContinue = () => {
    if (isEcommerce) {
      setStep("details");
    } else {
      finishOnboarding(false);
    }
  };

  const finishOnboarding = async (ecommerce: boolean, brandData?: {
    website: string;
    nicho: string;
    instagram: string;
    descricao: string;
    aparecerCatalogo: boolean;
  }) => {
    if (!user) return;
    setLoading(true);

    try {
      // Update profile with all fields
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          is_ecommerce: ecommerce,
          onboarding_completed: true,
          nome_negocio: nomeNegocio || null,
          cnpj: cnpj || null,
          phone: phone || null,
          loja_online_url: brandData?.website || website || null,
          loja_shopee_url: lojaShopeeUrl || null,
          loja_mercado_livre_url: lojaMercadoLivreUrl || null,
          loja_shein_url: lojaSheinUrl || null,
          loja_temu_url: lojaTemuUrl || null,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // If ecommerce and wants to appear in catalog, create/update brand
      if (ecommerce && brandData?.aparecerCatalogo) {
        const { data: existingBrand } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingBrand) {
          await supabase
            .from("brands")
            .update({
              website_url: brandData.website,
              category: brandData.nicho,
              instagram_url: brandData.instagram || null,
              short_description: brandData.descricao,
              name: nomeNegocio || profile?.full_name || "Minha Marca",
              is_active: true,
              approval_status: "pending",
              status: "pending",
            })
            .eq("id", existingBrand.id);
        } else {
          await supabase.from("brands").insert({
            user_id: user.id,
            name: nomeNegocio || profile?.full_name || "Minha Marca",
            website_url: brandData.website,
            category: brandData.nicho,
            instagram_url: brandData.instagram || null,
            short_description: brandData.descricao,
            is_active: true,
            approval_status: "pending",
            status: "pending",
          });
        }
      }

      await refreshProfile();
      toast.success("Cadastro concluído!");
      navigate("/app", { replace: true });
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDetails = async () => {
    await finishOnboarding(true, {
      website,
      nicho,
      instagram,
      descricao,
      aparecerCatalogo,
    });
  };

  const handleSkip = async () => {
    await finishOnboarding(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {step === "type" && (
          <div className="space-y-8 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Bem-vindo! 🎉
              </h1>
              <p className="text-muted-foreground text-sm">
                Para personalizar sua experiência, nos conte um pouco sobre você.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleTypeSelection(true)}
                disabled={loading}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">Sim, tenho um e-commerce</p>
                  <p className="text-muted-foreground text-xs mt-1">Loja virtual própria ou marketplace</p>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelection(false)}
                disabled={loading}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/60 bg-card hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer"
              >
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                  <User className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">Não, ainda não</p>
                  <p className="text-muted-foreground text-xs mt-1">Estou começando ou sou consultor</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Dados de contato
              </h1>
              <p className="text-muted-foreground text-sm">
                Tudo opcional — você pode preencher depois.
              </p>
            </div>

            <div className="space-y-4 bg-card rounded-2xl border border-border/60 p-6">
              <div className="space-y-2">
                <Label htmlFor="nomeNegocio">Nome do negócio</Label>
                <Input
                  id="nomeNegocio"
                  placeholder="Ex: Minha Loja"
                  value={nomeNegocio}
                  onChange={(e) => setNomeNegocio(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>

            <Button
              onClick={handleContactContinue}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continuar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Sobre seu e-commerce
              </h1>
              <p className="text-muted-foreground text-sm">
                Preencha o que quiser — todos os campos são opcionais.
              </p>
            </div>

            <div className="space-y-4 bg-card rounded-2xl border border-border/60 p-6">
              <div className="space-y-2">
                <Label htmlFor="website">Site do e-commerce</Label>
                <Input
                  id="website"
                  placeholder="https://minhaloja.com.br"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nicho">Nicho / Categoria</Label>
                <Select value={nicho} onValueChange={setNicho}>
                  <SelectTrigger id="nicho">
                    <SelectValue placeholder="Selecione seu nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHOS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@minhaloja"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Breve descrição da marca</Label>
                <Textarea
                  id="descricao"
                  placeholder="O que sua marca vende e o que a torna especial..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{descricao.length}/160</p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Onde você vende? <span className="text-muted-foreground font-normal text-xs">(opcional)</span></p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="shopee" className="text-xs">Shopee</Label>
                    <Input id="shopee" placeholder="https://shopee.com.br/..." value={lojaShopeeUrl} onChange={(e) => setLojaShopeeUrl(e.target.value)} className="h-8 text-sm" maxLength={255} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ml" className="text-xs">Mercado Livre</Label>
                    <Input id="ml" placeholder="https://lista.mercadolivre.com.br/..." value={lojaMercadoLivreUrl} onChange={(e) => setLojaMercadoLivreUrl(e.target.value)} className="h-8 text-sm" maxLength={255} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shein" className="text-xs">Shein</Label>
                    <Input id="shein" placeholder="https://shein.com/..." value={lojaSheinUrl} onChange={(e) => setLojaSheinUrl(e.target.value)} className="h-8 text-sm" maxLength={255} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temu" className="text-xs">Temu</Label>
                    <Input id="temu" placeholder="https://temu.com/..." value={lojaTemuUrl} onChange={(e) => setLojaTemuUrl(e.target.value)} className="h-8 text-sm" maxLength={255} />
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog opt-in */}
            <div className="flex items-start gap-3 bg-card rounded-2xl border border-border/60 p-5">
              <Switch
                id="catalogo"
                checked={aparecerCatalogo}
                onCheckedChange={setAparecerCatalogo}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="catalogo" className="font-medium text-sm cursor-pointer">
                  Quero aparecer no Catálogo de Marcas
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao ativar, você aceita que sua marca seja exibida publicamente no catálogo de marcas dos mentorados. Sua marca será revisada antes de ser publicada.
                </p>
                {aparecerCatalogo && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Sua marca passará por aprovação antes de ficar visível</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1"
              >
                Pular por agora
              </Button>
              <Button
                onClick={handleSubmitDetails}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Concluir <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
