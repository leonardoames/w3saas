import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface Product {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  details_url: string | null;
  whatsapp_url: string | null;
  button_text: string | null;
  display_order: number;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: ProductFormDialogProps) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [detailsUrl, setDetailsUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [buttonText, setButtonText] = useState("Falar com Especialista");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setTagline(product.tagline || "");
      setDescription(product.description || "");
      setImageUrl(product.image_url || "");
      setDetailsUrl(product.details_url || "");
      setWhatsappUrl(product.whatsapp_url || "");
      setButtonText(product.button_text || "Falar com Especialista");
      setDisplayOrder(product.display_order);
      setImagePreview(product.image_url || null);
    } else {
      setTitle("");
      setTagline("");
      setDescription("");
      setImageUrl("");
      setDetailsUrl("");
      setWhatsappUrl("");
      setButtonText("Falar com Especialista");
      setDisplayOrder(0);
      setImagePreview(null);
    }
    setImageFile(null);
  }, [product, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}_${sanitizedName}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    let finalImageUrl = imageUrl;
    try {
      if (imageFile) finalImageUrl = await uploadImage(imageFile);
    } catch {
      toast.error("Erro ao fazer upload da imagem");
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      image_url: finalImageUrl.trim() || null,
      details_url: detailsUrl.trim() || null,
      whatsapp_url: whatsappUrl.trim() || null,
      button_text: buttonText.trim() || "Falar com Especialista",
      display_order: displayOrder,
    };

    let error;
    if (product) {
      ({ error } = await supabase.from("mentoria_products" as any).update(payload).eq("id", product.id));
    } else {
      ({ error } = await supabase.from("mentoria_products" as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar solução");
      console.error(error);
    } else {
      toast.success(product ? "Solução atualizada!" : "Solução criada!");
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Solução" : "Nova Solução"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input placeholder="Ex: Mentoria AMES" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input placeholder="Ex: by W3 Educação" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea placeholder="O que essa solução resolve?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Imagem</Label>
            {imagePreview ? (
              <div className="relative w-full rounded-md overflow-hidden border border-border bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted transition-colors"
              >
                <Upload className="h-5 w-5" />
                Clique para selecionar uma imagem
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="space-y-2">
            <Label>Texto do Botão</Label>
            <Input placeholder="Ex: Falar com Especialista" value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link "Saiba Mais"</Label>
              <Input placeholder="https://..." value={detailsUrl} onChange={(e) => setDetailsUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link WhatsApp</Label>
              <Input placeholder="https://wa.me/..." value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ordem de exibição</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
