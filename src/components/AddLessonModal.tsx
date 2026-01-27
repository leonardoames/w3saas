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

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleTitle: string;
  onSuccess: () => void;
}

export function AddLessonModal({ isOpen, onClose, moduleId, moduleTitle, onSuccess }: AddLessonModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    panda_video_url: "",
    duration: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("order")
        .eq("module_id", moduleId)
        .order("order", { ascending: false })
        .limit(1);

      const nextOrder = lessons && lessons.length > 0 ? lessons[0].order + 1 : 1;

      const { error } = await supabase.from("lessons").insert({
        module_id: moduleId,
        title: formData.title,
        description: formData.description,
        panda_video_id: formData.panda_video_url,
        duration: formData.duration,
        order: nextOrder,
      });

      if (error) throw error;

      toast({
        title: "✅ Aula adicionada!",
        description: "A nova aula foi criada com sucesso.",
      });

      setFormData({ title: "", description: "", panda_video_url: "", duration: "" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar aula:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível adicionar a aula.",
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
          <DialogTitle>Adicionar Nova Aula</DialogTitle>
          <DialogDescription>Adicionar aula ao {moduleTitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Aula *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Aula 1: Introdução"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição breve da aula"
              required
            />
          </div>

          <div>
            <Label htmlFor="panda_video_url">URL do Vídeo (Panda Video) *</Label>
            <Input
              id="panda_video_url"
              value={formData.panda_video_url}
              onChange={(e) => setFormData({ ...formData, panda_video_url: e.target.value })}
              placeholder="https://player-vz-XXXXX.tv.pandavideo.com.br/embed/?v=..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">📍 Cole a URL completa de incorporação do Panda Video</p>
          </div>

          <div>
            <Label htmlFor="duration">Duração *</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Ex: 15:30"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Aula
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
