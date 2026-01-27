import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddModuleModal({ isOpen, onClose, onSuccess }: AddModuleModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get the next order number
      const { data: modules } = await supabase
        .from("course_modules")
        .select("order")
        .order("order", { ascending: false })
        .limit(1);

      const nextOrder = modules && modules.length > 0 ? modules[0].order + 1 : 1;

      const { error } = await supabase.from("course_modules").insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        order: nextOrder,
      });

      if (error) throw error;

      toast({
        title: "✅ Módulo criado!",
        description: "O novo módulo foi adicionado com sucesso.",
      });

      setFormData({ title: "", description: "" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao criar módulo:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível criar o módulo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Módulo</DialogTitle>
          <DialogDescription>Crie um novo módulo para organizar suas aulas</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="module-title">Título do Módulo *</Label>
            <Input
              id="module-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Módulo 1: Fundamentos"
              required
            />
          </div>

          <div>
            <Label htmlFor="module-description">Descrição</Label>
            <Textarea
              id="module-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição breve do módulo"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Módulo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
