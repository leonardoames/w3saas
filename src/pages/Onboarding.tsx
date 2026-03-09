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

  const [step, setStep] = useState<"type" | "details">("type");
  const [isEcommerce, setIsEcommerce] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Ecommerce form fields
  const [website, setWebsite] = useState("");
  const [nicho, setNicho] = useState("");
  const [instagram, setInstagram] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aparecerCatalogo, setAparecerCatalogo] = useState(false);

  const handleTypeSelection = async (ecommerce: boolean) => {
    setIsEcommerce(ecommerce);
    if (!ecommerce) {
      // Not ecommerce — save and skip to app
      await finishOnboarding(false);
    } else {
      setStep("details");
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
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_ecommerce: ecommerce,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // If ecommerce and wants to appear in catalog, create/update brand
      if (ecommerce && brandData?.aparecerCatalogo) {
        // Check if user already has a brand
        const { data: existingBrand } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingBrand) {
          // Update existing brand
          await supabase
            .from("brands")
            .update({
              website_url: brandData.website,
              category: brandData.nicho,
              instagram_url: brandData.instagram || null,
              short_description: brandData.descricao,
              name: profile?.full_name || "Minha Marca",
              is_active: true,
              approval_status: "pending",
              status: "pending",
            })
            .eq("id", existingBrand.id);
        } else {
          // Create new brand
          await supabase.from("brands").insert({
            user_id: user.id,
            name: profile?.full_name || "Minha Marca",
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
        {step === "type" ? (
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

            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
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
