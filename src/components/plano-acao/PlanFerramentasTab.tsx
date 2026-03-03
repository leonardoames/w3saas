import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Wrench, ExternalLink, FileSpreadsheet, Lightbulb, Pencil } from "lucide-react";
import { AddFerramentaDialog } from "./AddFerramentaDialog";

interface Ferramenta {
  id: string;
  title: string;
  description: string | null;
  type: string;
  file_url: string | null;
  external_url: string | null;
}

const typeConfig: Record<string, { label: string; icon: typeof Wrench }> = {
  planilha: { label: "Planilha", icon: FileSpreadsheet },
  solucao: { label: "Solução", icon: Lightbulb },
  ferramenta: { label: "Ferramenta", icon: Wrench },
};

interface PlanFerramentasTabProps {
  userId: string;
}

export function PlanFerramentasTab({ userId }: PlanFerramentasTabProps) {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Ferramenta | null>(null);
  const { toast } = useToast();

  const fetchFerramentas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_ferramentas")
      .select("id, title, description, type, file_url, external_url")
      .eq("user_id", userId)
      .order("created_at");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    setFerramentas((data as any) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchFerramentas(); }, [fetchFerramentas]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plan_ferramentas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } else {
      toast({ title: "Ferramenta removida" });
      fetchFerramentas();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => { setEditData(null); setDialogOpen(true); }}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar ferramenta
      </Button>

      {ferramentas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma ferramenta cadastrada ainda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ferramentas.map((f) => {
            const cfg = typeConfig[f.type] || typeConfig.ferramenta;
            const Icon = cfg.icon;
            return (
              <Card key={f.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{f.title}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">{cfg.label}</Badge>
                    </div>
                    {f.description && (
                      <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(f.file_url || f.external_url) && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={f.file_url || f.external_url || "#"} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setEditData(f); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddFerramentaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        onSaved={fetchFerramentas}
        editData={editData}
      />
    </div>
  );
}
