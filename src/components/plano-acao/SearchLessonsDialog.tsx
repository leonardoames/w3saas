import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  module_title: string;
  course_title: string;
}

interface SearchLessonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  linkedLessonIds: string[];
  onLinked: () => void;
}

export function SearchLessonsDialog({
  open,
  onOpenChange,
  userId,
  linkedLessonIds,
  onLinked,
}: SearchLessonsDialogProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setSearch("");
    fetchLessons();
  }, [open]);

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, module_id, course_modules(title, courses(title))")
      .order("title");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const mapped: Lesson[] = (data || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      module_title: l.course_modules?.title || "Sem módulo",
      course_title: l.course_modules?.courses?.title || "Sem curso",
    }));
    setLessons(mapped);
    setLoading(false);
  };

  const filtered = lessons.filter(
    (l) =>
      !linkedLessonIds.includes(l.id) &&
      (l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.module_title.toLowerCase().includes(search.toLowerCase()) ||
        l.course_title.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    const rows = selected.map((lesson_id) => ({
      user_id: userId,
      lesson_id,
      created_by: userId, // will be overridden below
    }));

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser();
    const finalRows = rows.map((r) => ({ ...r, created_by: user?.id || userId }));

    const { error } = await supabase.from("plan_aulas").insert(finalRows as any);
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao vincular aulas", variant: "destructive" });
    } else {
      toast({ title: `${selected.length} aula(s) vinculada(s)` });
      onLinked();
      onOpenChange(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar Aulas</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, módulo ou curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma aula disponível
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((lesson) => (
                <label
                  key={lesson.id}
                  className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(lesson.id)}
                    onCheckedChange={() => toggleSelect(lesson.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lesson.course_title} › {lesson.module_title}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || selected.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vincular {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
