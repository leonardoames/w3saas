import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BrandForm } from "@/components/brands/BrandForm";
import { ExternalLink, Instagram, Facebook, Plus, Loader2, AlertCircle, Store } from "lucide-react";
import type { Brand } from "@/types/brand";

export default function Catalogo() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [canAddBrand, setCanAddBrand] = useState(false);
  const [userBrandsCount, setUserBrandsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
    checkUserPermissions();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBrands(data || []);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast({
        title: "Erro ao carregar marcas",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserPermissions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Verifica se é admin
      const { data: adminData } = await supabase.rpc("is_current_user_admin");
      setIsAdmin(adminData === true);

      // Verifica quantas marcas o usuário tem
      const { data: countData } = await supabase.rpc("get_user_active_brands_count", {
        check_user_id: user.id,
      });

      setUserBrandsCount(countData || 0);

      // Verifica se pode adicionar marca
      const { data: canAddData } = await supabase.rpc("can_user_add_brand", {
        check_user_id: user.id,
      });

      setCanAddBrand(canAddData === true);
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const handleSuccess = () => {
    fetchBrands();
    checkUserPermissions();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Marcas</h1>
          <p className="mt-2 text-muted-foreground">
            Conheça as marcas dos nossos mentorados e apoie outros empreendedores
          </p>
        </div>

        <div>
          {canAddBrand ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Marca
            </Button>
          ) : (
            !isAdmin &&
            userBrandsCount >= 1 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você já possui uma marca cadastrada. Usuários podem ter apenas 1 marca ativa.
                </AlertDescription>
              </Alert>
            )
          )}
        </div>
      </div>

      {/* Stats */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Marcas</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{brands.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Brands Grid */}
      {brands.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={`Logo ${brand.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-xl">{brand.name}</CardTitle>
                <div className="mt-2">
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {brand.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">{brand.short_description}</p>

                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <a href={brand.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visitar Loja
                    </a>
                  </Button>

                  {(brand.instagram_url || brand.facebook_url) && (
                    <div className="flex gap-2">
                      {brand.instagram_url && (
                        <Button variant="outline" size="icon" asChild className="flex-1">
                          <a href={brand.instagram_url} target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {brand.facebook_url && (
                        <Button variant="outline" size="icon" asChild className="flex-1">
                          <a href={brand.facebook_url} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma marca cadastrada ainda</p>
            <p className="mt-2 text-sm text-muted-foreground">Seja o primeiro a adicionar sua marca ao catálogo!</p>
            {canAddBrand && (
              <Button onClick={() => setFormOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Marca
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <BrandForm open={formOpen} onOpenChange={setFormOpen} onSuccess={handleSuccess} />
    </div>
  );
}
