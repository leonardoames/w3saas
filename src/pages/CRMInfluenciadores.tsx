import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, GripVertical, User, Phone, AtSign } from "lucide-react";

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
}

const STAGES = [
  { id: "em_qualificacao", label: "Em Qualificação" },
  { id: "contato_enviado", label: "Contato Enviado" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
  { id: "produto_enviado", label: "Produto Enviado" },
  { id: "publicacao_feita", label: "Publicação Feita" },
];

const CRMInfluenciadores = () => {
  const { toast } = useToast();
  const [influenciadores, setInfluenciadores] = useState<Influenciador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInfluenciador, setSelectedInfluenciador] = useState<Influenciador | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formSocialHandle, setFormSocialHandle] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  // Edit state
  const [editObservacoes, setEditObservacoes] = useState("");

  useEffect(() => {
    fetchInfluenciadores();
  }, []);

  const fetchInfluenciadores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("influenciadores")
        .select("*")
        .eq("user_id", user.id)
        .order("stage_order", { ascending: true });

      if (error) throw error;
      setInfluenciadores(data || []);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const maxOrder = influenciadores
        .filter(i => i.stage === "em_qualificacao")
        .reduce((max, i) => Math.max(max, i.stage_order), -1);

      const { data, error } = await supabase
        .from("influenciadores")
        .insert({
          user_id: user.id,
          nome: formNome.trim(),
          social_handle: formSocialHandle.trim() || null,
          telefone: formTelefone.trim() || null,
          observacoes: formObservacoes.trim() || null,
          stage: "em_qualificacao",
          stage_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setInfluenciadores([...influenciadores, data]);
      setFormNome("");
      setFormSocialHandle("");
      setFormTelefone("");
      setFormObservacoes("");
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

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    const card = influenciadores.find(i => i.id === draggedCard);
    if (!card || card.stage === targetStage) {
      setDraggedCard(null);
      return;
    }

    try {
      const cardsInTargetStage = influenciadores.filter(i => i.stage === targetStage);
      const maxOrder = cardsInTargetStage.reduce((max, i) => Math.max(max, i.stage_order), -1);

      const { error } = await supabase
        .from("influenciadores")
        .update({ stage: targetStage, stage_order: maxOrder + 1 })
        .eq("id", draggedCard);

      if (error) throw error;

      setInfluenciadores(prev =>
        prev.map(i =>
          i.id === draggedCard
            ? { ...i, stage: targetStage, stage_order: maxOrder + 1 }
            : i
        )
      );

      toast({
        title: "Movido",
        description: `Influenciador movido para "${STAGES.find(s => s.id === targetStage)?.label}"`,
      });
    } catch (error) {
      console.error("Error moving card:", error);
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
    setEditObservacoes(influenciador.observacoes || "");
    setIsDetailSheetOpen(true);
  };

  const handleSaveObservacoes = async () => {
    if (!selectedInfluenciador) return;

    try {
      const { error } = await supabase
        .from("influenciadores")
        .update({ observacoes: editObservacoes.trim() || null })
        .eq("id", selectedInfluenciador.id);

      if (error) throw error;

      setInfluenciadores(prev =>
        prev.map(i =>
          i.id === selectedInfluenciador.id
            ? { ...i, observacoes: editObservacoes.trim() || null }
            : i
        )
      );

      setSelectedInfluenciador(prev =>
        prev ? { ...prev, observacoes: editObservacoes.trim() || null } : null
      );

      toast({
        title: "Salvo",
        description: "Observações atualizadas com sucesso!",
      });
    } catch (error) {
      console.error("Error saving observacoes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as observações.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInfluenciador = async () => {
    if (!selectedInfluenciador) return;

    try {
      const { error } = await supabase
        .from("influenciadores")
        .delete()
        .eq("id", selectedInfluenciador.id);

      if (error) throw error;

      setInfluenciadores(prev => prev.filter(i => i.id !== selectedInfluenciador.id));
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
    return influenciadores
      .filter(i => i.stage === stageId)
      .sort((a, b) => a.stage_order - b.stage_order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CRM de Influenciadores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas parcerias com influenciadores
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Influenciador
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  placeholder="Ex: (11) 99999-9999"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <Card className="bg-muted/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{stage.label}</span>
                  <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                    {getCardsByStage(stage.id).length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[200px]">
                {getCardsByStage(stage.id).map((influenciador) => (
                  <div
                    key={influenciador.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, influenciador.id)}
                    onClick={() => handleCardClick(influenciador)}
                    className={`bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors ${
                      draggedCard === influenciador.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {influenciador.nome}
                        </p>
                        {influenciador.social_handle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {influenciador.social_handle}
                          </p>
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

      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent>
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
                  <div>
                    <p className="font-semibold text-foreground">{selectedInfluenciador.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {STAGES.find(s => s.id === selectedInfluenciador.stage)?.label}
                    </p>
                  </div>
                </div>

                {selectedInfluenciador.social_handle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AtSign className="h-4 w-4" />
                    <span>{selectedInfluenciador.social_handle}</span>
                  </div>
                )}

                {selectedInfluenciador.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{selectedInfluenciador.telefone}</span>
                  </div>
                )}
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
                <Button onClick={handleSaveObservacoes} size="sm">
                  Salvar Observações
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={handleDeleteInfluenciador}
                  className="w-full"
                >
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
