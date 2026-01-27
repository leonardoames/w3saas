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

interface Lesson {
  id: string;
  title: string;
  description: string;
  panda_video_id: string;
  duration: string;
}

interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onSuccess: () => void;
}

export function EditLessonModal({ isOpen, onClose, lesson, onSuccess }: EditLessonModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    panda_video_url: "",
    duration: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description || "",
        panda_video_url: lesson.panda_video_id || "",
        duration: lesson.duration || "",
      });
    }
  }, [lesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;
    
    setSaving(true);

    try {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          panda_video_id: formData.panda_video_url.trim(),
          duration: formData.duration.trim() || null,
        })
        .eq("id", lesson.id);

      if (error) throw error;

      toast({
        title: "✅ Aula atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar aula:", error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível atualizar a aula.",
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
          <DialogTitle>Editar Aula</DialogTitle>
          <DialogDescription>Altere as informações da aula</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-lesson-title">Título da Aula *</Label>
            <Input
              id="edit-lesson-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Aula 1: Introdução"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-lesson-description">Descrição</Label>
            <Textarea
              id="edit-lesson-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição breve da aula"
            />
          </div>

          <div>
            <Label htmlFor="edit-panda-video-url">URL do Vídeo (Panda Video) *</Label>
            <Input
              id="edit-panda-video-url"
              value={formData.panda_video_url}
              onChange={(e) => setFormData({ ...formData, panda_video_url: e.target.value })}
              placeholder="https://player-vz-XXXXX.tv.pandavideo.com.br/embed/?v=..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">📍 Cole a URL completa de incorporação do Panda Video</p>
          </div>

          <div>
            <Label htmlFor="edit-duration">Duração</Label>
            <Input
              id="edit-duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Ex: 15:30"
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
