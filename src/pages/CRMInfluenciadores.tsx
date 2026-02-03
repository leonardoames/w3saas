import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, User, Phone, AtSign, Search, X, Tag, MessageCircle } from "lucide-react";

interface Influenciador {
  id: string;
  user_id: string;
  nome: string;
  social_handle: string | null;
  telefone: string | null;
  observacoes: string | null;
  stage: string;
  stage_order: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  status: string;
}

const STAGES = [
  { id: "em_qualificacao", label: "Em Qualificação" },
  { id: "contato_enviado", label: "Contato Enviado" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
  { id: "produto_enviado", label: "Produto Enviado" },
  { id: "publicacao_feita", label: "Publicação Feita" },
];

const STATUS_OPTIONS = [
  { id: "em_aberto", label: "Em Aberto", color: "bg-blue-500/20 text-blue-600" },
  { id: "ganho", label: "Ganho", color: "bg-green-500/20 text-green-600" },
  { id: "perdido", label: "Perdido", color: "bg-red-500/20 text-red-600" },
];

// Formata telefone para exibição: (XX) XXXXX-XXXX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Remove formatação do telefone
const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, "");
};

// Gera link do WhatsApp com DDI 55
const getWhatsAppLink = (phone: string): string => {
  const digits = unformatPhone(phone);
  return `https://wa.me/55${digits}`;
};

const CRMInfluenciadores = () => {
  const { toast } = useToast();
  const [influenciadores, setInfluenciadores] = useState<Influenciador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInfluenciador, setSelectedInfluenciador] = useState<Influenciador | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("em_aberto");

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formSocialHandle, setFormSocialHandle] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formTags, setFormTags] = useState("");

  // Edit state
  const [editNome, setEditNome] = useState("");
  const [editSocialHandle, setEditSocialHandle] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Get all unique tags from influenciadores
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    influenciadores.forEach((i) => {
      if (i.tags) {
        i.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [influenciadores]);

  // Filtered influenciadores
  const filteredInfluenciadores = useMemo(() => {
    return influenciadores.filter((i) => {
      // Status filter
      if (statusFilter && i.status !== statusFilter) return false;

      // Tag filter
      if (selectedTagFilter && (!i.tags || !i.tags.includes(selectedTagFilter))) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = i.nome.toLowerCase().includes(query);
        const matchesSocial = i.social_handle?.toLowerCase().includes(query);
        const matchesPhone = i.telefone?.includes(query);
        const matchesNotes = i.observacoes?.toLowerCase().includes(query);
        const matchesTags = i.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesSocial && !matchesPhone && !matchesNotes && !matchesTags) return false;
      }

      return true;
    });
  }, [influenciadores, searchQuery, selectedTagFilter, statusFilter]);

  useEffect(() => {
    fetchInfluenciadores();
  }, []);

  // --- CORREÇÃO 1: BUSCAR DADOS DIRETO DO BANCO ---
  const fetchInfluenciadores = async () => {
    try {
      const { data, error } = await supabase.from("influenciadores").select("*");

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        tags: item.tags || [],
        status: item.status || "em_aberto",
      }));

      setInfluenciadores(mappedData);
    } catch (error) {
      console.error("Error fetching influenciadores:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os influenciadores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseTags = (tagsString: string): string[] => {
    return tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  // --- CORREÇÃO 2: ADICIONAR DIRETO NO BANCO ---
  const handleAddInfluenciador = async () => {
    if (!formNome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o nome do influenciador.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Pega o usuário atual para vincular o registro (obrigatório se RLS estiver ativo)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const maxOrder = influenciadores
        .filter((i) => i.stage === "em_qualificacao")
        .reduce((max, i) => Math.max(max, i.stage_order), -1);

      const tags = parseTags(formTags);

      const newInfluenciador = {
        nome: formNome.trim(),
        social_handle: formSocialHandle.trim() || null,
        telefone: unformatPhone(formTelefone) || null,
        observacoes: formObservacoes.trim() || null,
        stage: "em_qualificacao",
        stage_order: maxOrder + 1,
        tags: tags,
        status: "em_aberto",
        user_id: user?.id, // Adiciona o user_id se disponível
      };

      const { data, error } = await supabase.from("influenciadores").insert(newInfluenciador).select().single();

      if (error) throw error;

      setInfluenciadores([...influenciadores, { ...data, tags: data.tags || [], status: data.status || "em_aberto" }]);
      setFormNome("");
      setFormSocialHandle("");
      setFormTelefone("");
      setFormObservacoes("");
      setFormTags("");
      setIsAddDialogOpen(false);

      toast({
        title: "Sucesso",
        description: "Influenciador adicionado com sucesso!",
      });
    } catch (error) {
      console.error("Error adding influenciador:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o influenciador.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // --- CORREÇÃO 3: MOVER (DRAG & DROP) DIRETO NO BANCO ---
  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    const card = influenciadores.find((i) => i.id === draggedCard);
    if (!card || card.stage === targetStage) {
      setDraggedCard(null);
      return;
    }

    const previousInfluenciadores = [...influenciadores];

    try {
      const cardsInTargetStage = influenciadores.filter((i) => i.stage === targetStage);
      const maxOrder = cardsInTargetStage.reduce((max, i) => Math.max(max, i.stage_order), -1);
      const newOrder = maxOrder + 1;

      const updatedCard = {
        ...card,
        stage: targetStage,
        stage_order: newOrder,
        updated_at: new Date().toISOString(),
      };

      setInfluenciadores((prev) => prev.map((i) => (i.id === draggedCard ? updatedCard : i)));

      const { error } = await supabase
        .from("influenciadores")
        .update({
          stage: targetStage,
          stage_order: newOrder,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draggedCard);

      if (error) throw error;

      toast({
        title: "Movido",
        description: `Influenciador movido para "${STAGES.find((s) => s.id === targetStage)?.label}"`,
      });
    } catch (error) {
      console.error("Error moving card:", error);
      setInfluenciadores(previousInfluenciadores);
      toast({
        title: "Erro",
        description: "Não foi possível mover o influenciador.",
        variant: "destructive",
      });
    } finally {
      setDraggedCard(null);
    }
  };

  const handleCardClick = (influenciador: Influenciador) => {
    setSelectedInfluenciador(influenciador);
    setEditNome(influenciador.nome);
    setEditSocialHandle(influenciador.social_handle || "");
    setEditTelefone(formatPhone(influenciador.telefone || ""));
    setEditObservacoes(influenciador.observacoes || "");
    setEditTags(influenciador.tags?.join(", ") || "");
    setEditStatus(influenciador.status);
    setIsDetailSheetOpen(true);
  };

  // --- CORREÇÃO 4: SALVAR EDIÇÃO (STATUS/WHATSAPP) DIRETO NO BANCO ---
  const handleSaveInfluenciador = async () => {
    if (!selectedInfluenciador) return;

    if (!editNome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome não pode ficar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tags = parseTags(editTags);
      const unformattedPhone = unformatPhone(editTelefone);

      // Objeto com as atualizações
      const updates = {
        nome: editNome.trim(),
        social_handle: editSocialHandle.trim() || null,
        telefone: unformattedPhone || null,
        observacoes: editObservacoes.trim() || null,
        tags: tags,
        status: editStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("influenciadores").update(updates).eq("id", selectedInfluenciador.id);

      if (error) throw error;

      // Atualiza estado local
      const updatedInfluenciador = {
        ...selectedInfluenciador,
        ...updates,
      };

      setInfluenciadores((prev) => prev.map((i) => (i.id === selectedInfluenciador.id ? updatedInfluenciador : i)));

      setSelectedInfluenciador(updatedInfluenciador);

      toast({
        title: "Salvo",
        description: "Influenciador atualizado com sucesso!",
      });
    } catch (error) {
      console.error("Error saving influenciador:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  // --- CORREÇÃO 5: DELETAR DIRETO NO BANCO ---
  const handleDeleteInfluenciador = async () => {
    if (!selectedInfluenciador) return;

    try {
      const { error } = await supabase.from("influenciadores").delete().eq("id", selectedInfluenciador.id);

      if (error) throw error;

      setInfluenciadores((prev) => prev.filter((i) => i.id !== selectedInfluenciador.id));
      setIsDetailSheetOpen(false);
      setSelectedInfluenciador(null);

      toast({
        title: "Removido",
        description: "Influenciador removido com sucesso!",
      });
    } catch (error) {
      console.error("Error deleting influenciador:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o influenciador.",
        variant: "destructive",
      });
    }
  };

  const getCardsByStage = (stageId: string) => {
    return filteredInfluenciadores.filter((i) => i.stage === stageId).sort((a, b) => a.stage_order - b.stage_order);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTagFilter("");
    setStatusFilter("em_aberto");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">CRM de Influenciadores</h1>
            <p className="text-muted-foreground mt-1 text-sm">Gerencie suas parcerias com influenciadores</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar Influenciador</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Influenciador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do influenciador *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: João Silva"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social">@Instagram / @TikTok</Label>
                  <Input
                    id="social"
                    placeholder="Ex: @joaosilva"
                    value={formSocialHandle}
                    onChange={(e) => setFormSocialHandle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone de contato</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 99999-9999"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(formatPhone(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    placeholder="Ex: moda, lifestyle, fitness"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Notas sobre o influenciador..."
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddInfluenciador} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar influenciador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || selectedTagFilter || statusFilter !== "em_aberto") && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-1 overflow-hidden min-h-0">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex flex-col min-h-0 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <Card className="bg-muted/50 border-border flex flex-col flex-1 min-h-0 overflow-hidden">
              <CardHeader className="py-3 px-3 shrink-0">
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between gap-1">
                  <span className="truncate">{stage.label}</span>
                  <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full shrink-0">
                    {getCardsByStage(stage.id).length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 overflow-y-auto px-2 pb-3">
                {getCardsByStage(stage.id).map((influenciador) => (
                  <div
                    key={influenciador.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, influenciador.id)}
                    onClick={() => handleCardClick(influenciador)}
                    className={`bg-card border border-border rounded-lg p-2 sm:p-3 cursor-pointer hover:border-primary/50 transition-colors ${
                      draggedCard === influenciador.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 hidden sm:block" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="font-medium text-foreground text-sm truncate flex-1 min-w-0">
                            {influenciador.nome}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] sm:text-xs shrink-0 ${STATUS_OPTIONS.find((s) => s.id === influenciador.status)?.color}`}
                          >
                            {STATUS_OPTIONS.find((s) => s.id === influenciador.status)?.label}
                          </Badge>
                        </div>
                        {influenciador.social_handle && (
                          <p className="text-xs text-muted-foreground truncate">{influenciador.social_handle}</p>
                        )}
                        {influenciador.telefone && (
                          <a
                            href={getWhatsAppLink(influenciador.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span className="hidden sm:inline">{formatPhone(influenciador.telefone)}</span>
                            <span className="sm:hidden">WhatsApp</span>
                          </a>
                        )}
                        {influenciador.tags && influenciador.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {influenciador.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {influenciador.tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                +{influenciador.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Influenciador</SheetTitle>
          </SheetHeader>
          {selectedInfluenciador && (
            <div className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {STAGES.find((s) => s.id === selectedInfluenciador.stage)?.label}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome *</Label>
                  <Input id="edit-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-social">@Instagram / @TikTok</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-social"
                      value={editSocialHandle}
                      onChange={(e) => setEditSocialHandle(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-telefone">Telefone</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-telefone"
                        value={editTelefone}
                        onChange={(e) => setEditTelefone(formatPhone(e.target.value))}
                        className="pl-9"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    {editTelefone && (
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={getWhatsAppLink(editTelefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-tags"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="pl-9"
                      placeholder="moda, lifestyle, fitness"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-observacoes">Observações</Label>
                  <Textarea
                    id="edit-observacoes"
                    placeholder="Adicione notas sobre este influenciador..."
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <Button onClick={handleSaveInfluenciador} className="w-full">
                  Salvar Alterações
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <Button variant="destructive" onClick={handleDeleteInfluenciador} className="w-full">
                  Remover Influenciador
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CRMInfluenciadores;
