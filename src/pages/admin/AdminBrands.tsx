import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Check,
  ExternalLink,
  Loader2,
  Search,
  Shield,
  Store,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Brand {
  id: string;
  user_id: string;
  name: string;
  category: string;
  short_description: string;
  long_description: string | null;
  logo_url: string | null;
  website_url: string;
  instagram_url: string | null;
  facebook_url: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Rejection dialog
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    brand: Brand | null;
  }>({
    open: false,
    brand: null,
  });
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchBrands();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data, error } = await supabase.rpc("is_current_user_admin");
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error("Error checking admin:", error);
      setIsAdmin(false);
    }
  };

  const fetchBrands = async () => {
    try {
      setLoading(true);
      
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (brandsError) throw brandsError;

      // Fetch user emails
      const userIds = [...new Set(brandsData?.map(b => b.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);

      const brandsWithEmail = (brandsData || []).map(brand => ({
        ...brand,
        user_email: emailMap.get(brand.user_id) || "Email não encontrado",
      }));

      setBrands(brandsWithEmail);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast({
        title: "Erro ao carregar marcas",
        description: error.message || "Não foi possível carregar as marcas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveBrand = async (brandId: string) => {
    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from("brands")
        .update({ 
          status: "approved", 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", brandId);

      if (error) throw error;

      await fetchBrands();

      toast({
        title: "Marca aprovada!",
        description: "A marca foi aprovada e já está visível no catálogo.",
      });
    } catch (error: any) {
      console.error("Error approving brand:", error);
      toast({
        title: "Erro ao aprovar marca",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const rejectBrand = async () => {
    if (!rejectDialog.brand) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("brands")
        .update({ 
          status: "rejected", 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", rejectDialog.brand.id);

      if (error) throw error;

      await fetchBrands();
      setRejectDialog({ open: false, brand: null });
      setRejectReason("");

      toast({
        title: "Marca rejeitada",
        description: "O usuário será notificado sobre a rejeição.",
      });
    } catch (error: any) {
      console.error("Error rejecting brand:", error);
      toast({
        title: "Erro ao rejeitar marca",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBrandActive = async (brandId: string, currentActive: boolean) => {
    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("brands")
        .update({ 
          is_active: !currentActive,
          updated_at: new Date().toISOString()
        })
        .eq("id", brandId);

      if (error) throw error;

      await fetchBrands();

      toast({
        title: currentActive ? "Marca desativada" : "Marca ativada",
        description: currentActive 
          ? "A marca não está mais visível no catálogo." 
          : "A marca agora está visível no catálogo.",
      });
    } catch (error: any) {
      console.error("Error toggling brand:", error);
      toast({
        title: "Erro ao atualizar marca",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBrands = brands.filter((brand) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      brand.name.toLowerCase().includes(searchLower) ||
      brand.user_email?.toLowerCase().includes(searchLower) ||
      brand.category.toLowerCase().includes(searchLower);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && brand.status === statusFilter;
  });

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === "pending") {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">Rejeitada</Badge>;
    }
    if (status === "approved" && isActive) {
      return <Badge variant="default">Aprovada</Badge>;
    }
    if (status === "approved" && !isActive) {
      return <Badge variant="outline">Desativada</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const pendingCount = brands.filter(b => b.status === "pending").length;
  const approvedCount = brands.filter(b => b.status === "approved").length;
  const rejectedCount = brands.filter(b => b.status === "rejected").length;

  if (!isAdmin && !loading) {
    return (
      <AdminLayout>
        <Card className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">Você precisa ser administrador para acessar esta página.</p>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6" />
              Gestão de Marcas
            </h2>
            <p className="text-sm text-muted-foreground">
              {brands.length} marcas cadastradas
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-500 font-medium">• {pendingCount} pendentes</span>
              )}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === "pending" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === "approved" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{approvedCount}</div>
              <div className="text-xs text-muted-foreground">Aprovadas</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === "rejected" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{rejectedCount}</div>
              <div className="text-xs text-muted-foreground">Rejeitadas</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma marca encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Marca</TableHead>
                      <TableHead className="min-w-[120px]">Usuário</TableHead>
                      <TableHead className="min-w-[100px]">Categoria</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Data</TableHead>
                      <TableHead className="min-w-[150px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {brand.logo_url ? (
                              <img 
                                src={brand.logo_url} 
                                alt={brand.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <Store className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{brand.name}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {brand.short_description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm break-all">{brand.user_email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{brand.category}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(brand.status, brand.is_active)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(brand.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {brand.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveBrand(brand.id)}
                                  disabled={actionLoading}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectDialog({ open: true, brand })}
                                  disabled={actionLoading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {brand.status === "approved" && (
                              <Button
                                size="sm"
                                variant={brand.is_active ? "outline" : "default"}
                                onClick={() => toggleBrandActive(brand.id, brand.is_active)}
                                disabled={actionLoading}
                              >
                                {brand.is_active ? "Desativar" : "Ativar"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <a href={brand.website_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, brand: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Marca</DialogTitle>
            <DialogDescription>
              Você está prestes a rejeitar a marca "{rejectDialog.brand?.name}". 
              Informe o motivo da rejeição (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da rejeição</Label>
              <Textarea
                id="reason"
                placeholder="Informe o motivo para o usuário..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, brand: null })}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={rejectBrand}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
