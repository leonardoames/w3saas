import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BrandForm } from "@/components/brands/BrandForm";
import { BrandCard } from "@/components/catalogo/BrandCard";
import { useBrandLikes } from "@/hooks/useBrandLikes";
import { Plus, Loader2, AlertCircle, Store, Search } from "lucide-react";
import type { Brand } from "@/types/brand";

export default function Catalogo() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [canAddBrand, setCanAddBrand] = useState(true);
  const [userBrandsCount, setUserBrandsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const brandIds = useMemo(() => brands.map((b) => b.id), [brands]);
  const { likes, toggleLike } = useBrandLikes(brandIds);

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [brands, search]);

  useEffect(() => {
    fetchBrands();
    checkUserPermissions();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("brands_public")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") { setBrands([]); return; }
        throw error;
      }
      setBrands((data || []) as Brand[]);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      if (error.code !== "42P01") {
        toast({ title: "Erro ao carregar marcas", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const checkUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCanAddBrand(false); return; }

      const { data: adminData } = await supabase.rpc("is_current_user_admin");
      const userIsAdmin = adminData === true;
      setIsAdmin(userIsAdmin);

      try {
        const { data: userBrands } = await (supabase as any)
          .from("brands").select("id").eq("user_id", user.id).eq("is_active", true);
        const count = userBrands?.length || 0;
        setUserBrandsCount(count);
        setCanAddBrand(userIsAdmin || count < 1);
      } catch {
        setCanAddBrand(true);
      }
    } catch {
      setCanAddBrand(true);
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title text-foreground">Catálogo de Marcas</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Conheça as marcas dos nossos mentorados e apoie outros empreendedores
          </p>
        </div>
        <div>
          {canAddBrand ? (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Marca
            </Button>
          ) : (
            !isAdmin && userBrandsCount >= 1 && (
              <Alert className="max-w-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Você já possui uma marca cadastrada.
                </AlertDescription>
              </Alert>
            )
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou nicho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Brand List */}
      {filteredBrands.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredBrands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              liked={likes[brand.id]?.liked ?? false}
              likeCount={likes[brand.id]?.count ?? 0}
              onToggleLike={toggleLike}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <Store className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-section-title text-muted-foreground">
            {search ? "Nenhuma marca encontrada" : "Nenhuma marca cadastrada ainda"}
          </p>
          <p className="mt-2 text-caption text-muted-foreground">
            {search ? "Tente outra busca" : "Seja o primeiro a adicionar sua marca!"}
          </p>
          {!search && canAddBrand && (
            <Button onClick={() => setFormOpen(true)} className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Primeira Marca
            </Button>
          )}
        </div>
      )}

      <BrandForm open={formOpen} onOpenChange={setFormOpen} onSuccess={handleSuccess} />
    </div>
  );
}
