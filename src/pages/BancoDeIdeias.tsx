import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Plus, List, Columns3, ChevronDown, ChevronUp, Camera, Kanban, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { IdeasListView } from "@/components/banco-ideias/IdeasListView";
import { IdeasKanbanView } from "@/components/banco-ideias/IdeasKanbanView";
import { IdeasFilters } from "@/components/banco-ideias/IdeasFilters";
import { IdeaDrawer } from "@/components/banco-ideias/IdeaDrawer";
import { cn } from "@/lib/utils";

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  type: string;
  format: string;
  channel: string;
  objective: string;
  hook: string | null;
  description: string | null;
  reference_url: string | null;
  responsible: string | null;
  priority: string;
  potential_score: number | null;
  status: string;
  published_url: string | null;
  due_date: string | null;
  publish_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type IdeaFormData = Omit<Idea, "id" | "user_id" | "created_at" | "updated_at">;

const emptyForm: IdeaFormData = {
  title: "",
  type: "criativo_pago",
  format: "video_curto",
  channel: "instagram",
  objective: "vendas_normal",
  hook: "",
  description: "",
  reference_url: "",
  responsible: "",
  priority: "media",
  potential_score: 3,
  status: "ideia",
  published_url: "",
  due_date: null,
  publish_date: null,
  tags: [],
};

export default function BancoDeIdeias() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [tipsOpen, setTipsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("banco_ideias_tips_collapsed");
      return saved === null ? true : saved !== "true";
    } catch {
      return true;
    }
  });

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("todos");
  const [filterChannel, setFilterChannel] = useState("todos");
  const [filterObjective, setFilterObjective] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todos");
  const [filterResponsible, setFilterResponsible] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const hasFilters = !!(search || filterType !== "todos" || filterChannel !== "todos" || filterObjective !== "todos" || filterPriority !== "todos" || filterResponsible !== "todos" || filterStatus !== "todos");

  const handleTipsToggle = () => {
    setTipsOpen(prev => {
      const next = !prev;
      try { localStorage.setItem("banco_ideias_tips_collapsed", next ? "false" : "true"); } catch {}
      return next;
    });
  };

  const loadIdeas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ideas" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar ideias");
    } else {
      const list = (data as any[]) || [];
      setIdeas(list);
      // Auto-collapse tips when user already has ideas (only if not manually set)
      if (list.length > 0) {
        try {
          const saved = localStorage.getItem("banco_ideias_tips_collapsed");
          if (saved === null) {
            setTipsOpen(false);
            localStorage.setItem("banco_ideias_tips_collapsed", "true");
          }
        } catch {}
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  const filtered = ideas.filter((idea) => {
    if (search && !idea.title.toLowerCase().includes(search.toLowerCase()) && !(idea.hook || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "todos" && idea.type !== filterType) return false;
    if (filterChannel !== "todos" && idea.channel !== filterChannel) return false;
    if (filterObjective !== "todos" && idea.objective !== filterObjective) return false;
    if (filterPriority !== "todos" && idea.priority !== filterPriority) return false;
    if (filterResponsible !== "todos" && idea.responsible !== filterResponsible) return false;
    if (filterStatus !== "todos" && idea.status !== filterStatus) return false;
    return true;
  });

  const uniqueResponsibles = [...new Set(ideas.map((i) => i.responsible).filter(Boolean))] as string[];

  const handleNew = () => {
    setEditingIdea(null);
    setDrawerOpen(true);
  };

  const handleEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setDrawerOpen(true);
  };

  const handleSave = async (formData: IdeaFormData) => {
    if (!user) return;
    const payload = {
      ...formData,
      user_id: user.id,
      hook: formData.hook || null,
      description: formData.description || null,
      reference_url: formData.reference_url || null,
      responsible: formData.responsible || null,
      published_url: formData.published_url || null,
      tags: formData.tags && formData.tags.length > 0 ? formData.tags : [],
    };

    if (editingIdea) {
      const { error } = await supabase
        .from("ideas" as any)
        .update(payload as any)
        .eq("id", editingIdea.id);
      if (error) { toast.error("Erro ao atualizar ideia"); return; }
      toast.success("Ideia atualizada!");
    } else {
      const { error } = await supabase
        .from("ideas" as any)
        .insert(payload as any);
      if (error) { toast.error("Erro ao criar ideia"); return; }
      toast.success("Ideia criada!");
    }

    // Save responsible to autocomplete table
    if (formData.responsible) {
      await supabase.from("idea_responsibles" as any).upsert(
        { user_id: user.id, name: formData.responsible } as any,
        { onConflict: "user_id,name" }
      );
    }

    setDrawerOpen(false);
    loadIdeas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ideas" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir ideia"); return; }
    toast.success("Ideia excluída!");
    loadIdeas();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("ideas" as any)
      .update({ status: newStatus } as any)
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    loadIdeas();
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("todos");
    setFilterChannel("todos");
    setFilterObjective("todos");
    setFilterPriority("todos");
    setFilterResponsible("todos");
    setFilterStatus("todos");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Banco de Ideias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus criativos e conteúdos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("p-1.5 rounded-md transition-colors", view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Ideia
          </Button>
        </div>
      </div>

      {/* Tips Card */}
      <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
        <button
          onClick={handleTipsToggle}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Como usar o Banco de Ideias</span>
          </div>
          {tipsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {tipsOpen && (
          <div className="px-4 pb-4 border-t border-border/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-semibold">Capture</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registre qualquer ideia antes que passe. Defina tipo, formato e canal:
                </p>
                <p className="text-xs text-muted-foreground">
                  Reel, Story, Review, Tutorial, UGC, Unboxing, Live...
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Kanban className="h-4 w-4" />
                  <span className="text-sm font-semibold">Priorize</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use o Kanban para mover ideias pelo funil:
                </p>
                <p className="text-xs text-muted-foreground">
                  Ideia → Em Produção → Publicado
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">Analise</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use o score de potencial (1–5) para decidir o que produzir primeiro e maximizar resultados.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Canais: Instagram, TikTok, YouTube, Shopee, Mercado Livre...
              </p>
              <Button size="sm" onClick={handleNew} className="gap-1.5 shrink-0 h-7 text-xs">
                <Plus className="h-3 w-3" />
                Criar minha primeira ideia
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <IdeasFilters
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterChannel={filterChannel}
        onFilterChannelChange={setFilterChannel}
        filterObjective={filterObjective}
        onFilterObjectiveChange={setFilterObjective}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
        filterResponsible={filterResponsible}
        onFilterResponsibleChange={setFilterResponsible}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        responsibles={uniqueResponsibles}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : ideas.length === 0 && !hasFilters ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Nenhuma ideia ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Comece cadastrando sua primeira ideia de criativo ou conteúdo</p>
          <Button onClick={handleNew} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Ideia
          </Button>
        </div>
      ) : view === "list" ? (
        <IdeasListView ideas={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      ) : (
        <IdeasKanbanView ideas={filtered} onEdit={handleEdit} onStatusChange={handleStatusChange} />
      )}

      {/* Drawer */}
      <IdeaDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        idea={editingIdea}
        onSave={handleSave}
        userId={user?.id}
      />
    </div>
  );
}
