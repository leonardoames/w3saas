import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Idea, IdeaFormData } from "@/pages/BancoDeIdeias";
import {
  TYPE_OPTIONS, FORMAT_OPTIONS, CHANNEL_OPTIONS, OBJECTIVE_OPTIONS,
  PRIORITY_OPTIONS, STATUS_OPTIONS,
} from "./ideaConstants";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
  onSave: (data: IdeaFormData) => void;
  userId?: string;
}

const emptyForm: IdeaFormData = {
  title: "", type: "criativo_pago", format: "video_curto", channel: "instagram",
  objective: "vendas_normal", hook: "", description: "", reference_url: "",
  responsible: "", priority: "media", potential_score: 3, status: "ideia",
  published_url: "", due_date: null, publish_date: null, tags: [],
};

export function IdeaDrawer({ open, onOpenChange, idea, onSave, userId }: Props) {
  const [form, setForm] = useState<IdeaFormData>(emptyForm);
  const [tagInput, setTagInput] = useState("");
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [showResponsibles, setShowResponsibles] = useState(false);

  useEffect(() => {
    if (idea) {
      setForm({
        title: idea.title, type: idea.type, format: idea.format, channel: idea.channel,
        objective: idea.objective, hook: idea.hook || "", description: idea.description || "",
        reference_url: idea.reference_url || "", responsible: idea.responsible || "",
        priority: idea.priority, potential_score: idea.potential_score || 3, status: idea.status,
        published_url: idea.published_url || "", due_date: idea.due_date, publish_date: idea.publish_date,
        tags: idea.tags || [],
      });
    } else {
      setForm(emptyForm);
    }
    setTagInput("");
  }, [idea, open]);

  useEffect(() => {
    if (userId && open) {
      supabase.from("idea_responsibles" as any).select("name").eq("user_id", userId).then(({ data }) => {
        setResponsibles((data as any[] || []).map((d: any) => d.name));
      });
    }
  }, [userId, open]);

  const set = (key: keyof IdeaFormData, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !(form.tags || []).includes(t)) {
      set("tags", [...(form.tags || []), t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => set("tags", (form.tags || []).filter((t) => t !== tag));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave(form);
  };

  const filteredResponsibles = responsibles.filter(
    (r) => form.responsible && r.toLowerCase().includes((form.responsible || "").toLowerCase()) && r !== form.responsible
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{idea ? "Editar Ideia" : "Nova Ideia"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nome da ideia" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tipo *</Label>
              <div className="flex gap-1 mt-1">
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => set("type", o.value)}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-md border transition-colors",
                      form.type === o.value ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Formato *</Label>
                <Select value={form.format} onValueChange={(v) => set("format", v)}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Canal *</Label>
                <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Estratégia */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estratégia</h3>
            <div>
              <Label className="text-xs">Objetivo *</Label>
              <Select value={form.objective} onValueChange={(v) => set("objective", v)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hook</Label>
              <Textarea
                value={form.hook || ""}
                onChange={(e) => set("hook", e.target.value)}
                placeholder="Qual a primeira frase ou cena que vai prender atenção?"
                className="mt-1 text-xs"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Detalhamento da ideia..."
                className="mt-1 text-xs"
                rows={4}
              />
            </div>
            <div>
              <Label className="text-xs">Link de referência</Label>
              <Input value={form.reference_url || ""} onChange={(e) => set("reference_url", e.target.value)} placeholder="https://..." className="mt-1 text-xs" type="url" />
            </div>
          </section>

          {/* Execução */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execução</h3>
            <div className="relative">
              <Label className="text-xs">Responsável</Label>
              <Input
                value={form.responsible || ""}
                onChange={(e) => { set("responsible", e.target.value); setShowResponsibles(true); }}
                onBlur={() => setTimeout(() => setShowResponsibles(false), 200)}
                onFocus={() => setShowResponsibles(true)}
                placeholder="Nome do responsável"
                className="mt-1 text-xs"
              />
              {showResponsibles && filteredResponsibles.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-32 overflow-y-auto">
                  {filteredResponsibles.map((r) => (
                    <button key={r} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted" onClick={() => { set("responsible", r); setShowResponsibles(false); }}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <div className="flex gap-2 mt-1">
                {PRIORITY_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="priority" checked={form.priority === o.value} onChange={() => set("priority", o.value)} className="accent-primary" />
                    <span className="text-xs">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Potencial</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => set("potential_score", n)} className="p-0.5">
                    <Star className={cn("h-5 w-5 transition-colors", n <= (form.potential_score || 0) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600 hover:text-zinc-400")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data de entrega</Label>
                <Input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value || null)} className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Data de publicação</Label>
                <Input type="date" value={form.publish_date || ""} onChange={(e) => set("publish_date", e.target.value || null)} className="mt-1 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1 mb-1">
                {(form.tags || []).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Digitar e pressionar Enter..."
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Publicação */}
          {form.status === "publicado" && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Publicação</h3>
              <div>
                <Label className="text-xs">Link publicado</Label>
                <Input value={form.published_url || ""} onChange={(e) => set("published_url", e.target.value)} placeholder="https://..." className="mt-1 text-xs" type="url" />
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!form.title.trim()}>Salvar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
