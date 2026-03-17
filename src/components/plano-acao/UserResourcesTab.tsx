import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";

const PANDA_EMBED_BASE = "https://player-vz-75e71015-90c.tv.pandavideo.com.br/embed/?v=";

interface LessonResult {
  id: string;
  title: string;
  panda_video_id: string;
  module_title: string;
  course_title: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  type: "video" | "arquivo";
  description: string | null;
}

interface UserResourcesTabProps {
  userId?: string;
  canEdit?: boolean;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // Loom
  const loom = url.match(/loom\.com\/share\/([a-f0-9]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  // Panda Video embed URL
  if (url.includes("pandavideo.com.br/embed")) return url;
  return null;
}

function VideoCard({ resource, onDelete, canEdit }: {
  resource: Resource;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const embedUrl = getEmbedUrl(resource.url);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{resource.title}</p>
              <Badge variant="secondary" className="text-[10px]">Aula</Badge>
            </div>
            {resource.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{resource.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {embedUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setExpanded(v => !v)}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? "Fechar" : "Assistir"}
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        {expanded && embedUrl && (
          <div className="border-t">
            <iframe
              src={embedUrl}
              className="w-full"
              style={{ height: "360px" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FileCard({ resource, onDelete, canEdit }: {
  resource: Resource;
  onDelete: () => void;
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{resource.title}</p>
            <Badge variant="outline" className="text-[10px]">Arquivo</Badge>
          </div>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{resource.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          {canEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserResourcesTab({ userId, canEdit = false }: UserResourcesTabProps) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const { toast } = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: "", url: "", type: "video", description: "" });

  // Lesson search state
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonResults, setLessonResults] = useState<LessonResult[]>([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonResult | null>(null);
  const [lessonDropOpen, setLessonDropOpen] = useState(false);
  const lessonSearchRef = useRef<HTMLDivElement>(null);
  const lessonSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lessonSearchRef.current && !lessonSearchRef.current.contains(e.target as Node)) {
        setLessonDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (lessonSearch.trim().length < 2) {
      setLessonResults([]);
      setLessonDropOpen(false);
      return;
    }
    if (lessonSearchTimer.current) clearTimeout(lessonSearchTimer.current);
    lessonSearchTimer.current = setTimeout(async () => {
      setLessonLoading(true);
      const { data } = await (supabase as any)
        .from("lessons")
        .select("id, title, panda_video_id, course_modules(title, courses(title))")
        .ilike("title", `%${lessonSearch.trim()}%`)
        .limit(10);
      setLessonResults(
        (data || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          panda_video_id: l.panda_video_id,
          module_title: l.course_modules?.title || "",
          course_title: l.course_modules?.courses?.title || "",
        }))
      );
      setLessonLoading(false);
      setLessonDropOpen(true);
    }, 300);
  }, [lessonSearch]);

  const fetchResources = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("client_resources")
      .select("id, title, url, type, description")
      .eq("user_id", targetId)
      .order("created_at", { ascending: true });
    setResources((data || []) as Resource[]);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("client_resources")
      .insert({
        user_id: targetId,
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        description: form.description.trim() || null,
        created_by: user?.id,
      });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao adicionar recurso", variant: "destructive" });
    } else {
      setForm({ title: "", url: "", type: "video", description: "" });
      setSelectedLesson(null);
      setLessonSearch("");
      setDialogOpen(false);
      fetchResources();
      toast({ title: "Recurso adicionado" });
    }
  };

  const handleSelectLesson = (lesson: LessonResult) => {
    setSelectedLesson(lesson);
    setLessonDropOpen(false);
    setLessonSearch("");
    setForm(f => ({
      ...f,
      title: lesson.title,
      url: PANDA_EMBED_BASE + lesson.panda_video_id,
    }));
  };

  const handleClearLesson = () => {
    setSelectedLesson(null);
    setForm(f => ({ ...f, title: "", url: "" }));
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from("client_resources")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover recurso", variant: "destructive" });
    } else {
      setResources(prev => prev.filter(r => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const videos = resources.filter(r => r.type === "video");
  const files = resources.filter(r => r.type === "arquivo");

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar recurso
          </Button>
        </div>
      )}

      {resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum recurso disponível ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canEdit ? "Adicione aulas e arquivos para este cliente." : "Seu tutor irá adicionar recursos em breve."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aulas ({videos.length})
              </p>
              {videos.map(r => (
                <VideoCard
                  key={r.id}
                  resource={r}
                  canEdit={canEdit}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Arquivos ({files.length})
              </p>
              {files.map(r => (
                <FileCard
                  key={r.id}
                  resource={r}
                  canEdit={canEdit}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setSelectedLesson(null); setLessonSearch(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar recurso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={v => { setForm(f => ({ ...f, type: v, title: "", url: "" })); setSelectedLesson(null); setLessonSearch(""); }}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Aula / Vídeo</SelectItem>
                  <SelectItem value="arquivo">Arquivo / Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "video" && (
              <div className="space-y-1">
                <Label className="text-xs">Buscar aula registrada</Label>
                {selectedLesson ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{selectedLesson.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedLesson.course_title} · {selectedLesson.module_title}</p>
                    </div>
                    <button type="button" onClick={handleClearLesson} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div ref={lessonSearchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={lessonSearch}
                        onChange={e => setLessonSearch(e.target.value)}
                        placeholder="Digite o nome da aula..."
                        className="pl-8 h-8 text-sm"
                      />
                      {lessonLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    {lessonDropOpen && lessonResults.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-lg max-h-52 overflow-y-auto">
                        {lessonResults.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleSelectLesson(l)}
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                          >
                            <p className="text-xs font-medium truncate">{l.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{l.course_title} · {l.module_title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Aula 1 - Fundação de marca"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {form.type === "video" ? "URL do vídeo (YouTube, Vimeo, Loom ou Panda)" : "Link (Google Drive, etc.)"}
              </Label>
              <Input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder={form.type === "video" ? "https://youtube.com/watch?v=..." : "https://drive.google.com/..."}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Contexto ou instruções..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.title.trim() || !form.url.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
