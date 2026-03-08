import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, CheckCircle, XCircle, MessageSquare, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Instruction {
  id: string;
  title: string;
  instruction_type: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  do: { label: "Fazer", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-500/15 text-green-500" },
  dont: { label: "Não Fazer", icon: <XCircle className="h-4 w-4" />, color: "bg-destructive/15 text-destructive" },
  context: { label: "Contexto", icon: <MessageSquare className="h-4 w-4" />, color: "bg-blue-500/15 text-blue-500" },
  persona: { label: "Persona", icon: <Shield className="h-4 w-4" />, color: "bg-purple-500/15 text-purple-500" },
};

export function InstructionsManager() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", instruction_type: "do", content: "", priority: 0 });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInstructions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ia_instructions")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstructions((data as Instruction[]) || []);
    } catch (error) {
      console.error("Error fetching instructions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstructions();
  }, [fetchInstructions]);

  const resetForm = () => {
    setFormData({ title: "", instruction_type: "do", content: "", priority: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("ia_instructions")
          .update({
            title: formData.title.trim(),
            instruction_type: formData.instruction_type,
            content: formData.content.trim(),
            priority: formData.priority,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Instrução atualizada!" });
      } else {
        const { error } = await supabase.from("ia_instructions").insert({
          title: formData.title.trim(),
          instruction_type: formData.instruction_type,
          content: formData.content.trim(),
          priority: formData.priority,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({ title: "Instrução criada!" });
      }
      resetForm();
      fetchInstructions();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("ia_instructions")
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;
      setInstructions((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !currentState } : i)));
    } catch (error) {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("ia_instructions").delete().eq("id", id);
      if (error) throw error;
      setInstructions((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Instrução removida" });
    } catch (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (instruction: Instruction) => {
    setFormData({
      title: instruction.title,
      instruction_type: instruction.instruction_type,
      content: instruction.content,
      priority: instruction.priority,
    });
    setEditingId(instruction.id);
    setShowForm(true);
  };

  const groupedInstructions = instructions.reduce(
    (acc, inst) => {
      const key = inst.instruction_type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(inst);
      return acc;
    },
    {} as Record<string, Instruction[]>,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando instruções...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Editar Instrução" : "Nova Instrução"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Título da instrução"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Select
                value={formData.instruction_type}
                onValueChange={(v) => setFormData({ ...formData, instruction_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="do">✅ Fazer</SelectItem>
                  <SelectItem value="dont">❌ Não Fazer</SelectItem>
                  <SelectItem value="context">💬 Contexto</SelectItem>
                  <SelectItem value="persona">🎭 Persona</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Conteúdo da instrução... Ex: Sempre recomende frete Full no Mercado Livre"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Prioridade:</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Instrução
        </Button>
      )}

      {/* Grouped list */}
      {(["do", "dont", "context", "persona"] as const).map((type) => {
        const items = groupedInstructions[type];
        if (!items || items.length === 0) return null;
        const config = TYPE_CONFIG[type];

        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config.color}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((inst) => (
                <Card key={inst.id} className={`transition-opacity ${!inst.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Switch
                      checked={inst.is_active}
                      onCheckedChange={() => handleToggle(inst.id, inst.is_active)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{inst.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inst.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(inst)}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(inst.id)}
                        disabled={deletingId === inst.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {instructions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma instrução cadastrada ainda.</p>
          <p className="text-xs mt-1">Adicione regras para personalizar o comportamento da IA W3.</p>
        </div>
      )}
    </div>
  );
}
