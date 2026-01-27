import { useState, useEffect } from "react";
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

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface EditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module | null;
  onSuccess: () => void;
}

export function EditModuleModal({ isOpen, onClose, module, onSuccess }: EditModuleModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (module) {
      setFormData({
        title: module.title,
        description: module.description || "",
      });
    }
  }, [module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;
    
    setSaving(true);

    try {
      const { error } = await supabase
        .from("course_modules")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        })
        .eq("id", module.id);

      if (error) throw error;

      toast({
        title: "✅ Módulo atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar módulo:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível atualizar o módulo.",
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
          <DialogTitle>Editar Módulo</DialogTitle>
          <DialogDescription>Altere as informações do módulo</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-module-title">Título do Módulo *</Label>
            <Input
              id="edit-module-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Módulo 1: Fundamentos"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-module-description">Descrição</Label>
            <Textarea
              id="edit-module-description"
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
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
