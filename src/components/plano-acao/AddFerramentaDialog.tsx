import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface AddFerramentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
  editData?: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    file_url: string | null;
    external_url: string | null;
  } | null;
}

export function AddFerramentaDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
  editData,
}: AddFerramentaDialogProps) {
  const [title, setTitle] = useState(editData?.title || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [type, setType] = useState(editData?.type || "planilha");
  const [externalUrl, setExternalUrl] = useState(editData?.external_url || "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("planilha");
    setExternalUrl("");
    setFile(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetForm();
    else if (editData) {
      setTitle(editData.title);
      setDescription(editData.description || "");
      setType(editData.type);
      setExternalUrl(editData.external_url || "");
    }
    onOpenChange(o);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    let fileUrl = editData?.file_url || null;

    if (file) {
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}_${sanitized}`;
      const { error: uploadError } = await supabase.storage
        .from("plan-ferramentas")
        .upload(path, file);

      if (uploadError) {
        toast({ title: "Erro ao fazer upload", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("plan-ferramentas")
        .getPublicUrl(path);
      fileUrl = publicData.publicUrl;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (editData) {
      const { error } = await supabase
        .from("plan_ferramentas")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          type,
          external_url: externalUrl.trim() || null,
          file_url: fileUrl,
        } as any)
        .eq("id", editData.id);

      if (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("plan_ferramentas").insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        type,
        external_url: externalUrl.trim() || null,
        file_url: fileUrl,
        created_by: user?.id || userId,
      } as any);

      if (error) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: editData ? "Ferramenta atualizada" : "Ferramenta adicionada" });
    resetForm();
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] bg-[#111111] border-l border-[#242424] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-[#242424]">
          <SheetTitle className="text-foreground">{editData ? "Editar Ferramenta" : "Adicionar Ferramenta"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da ferramenta" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" rows={3} />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planilha">Planilha</SelectItem>
                <SelectItem value="solucao">Solução</SelectItem>
                <SelectItem value="ferramenta">Ferramenta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-[hsl(var(--border)/0.3)] my-1" />

          <div>
            <Label>Link externo</Label>
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <Label>Ou fazer upload de arquivo</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Selecionar arquivo"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#242424] flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
