import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  details_url: string | null;
  whatsapp_url: string | null;
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
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [detailsUrl, setDetailsUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description || "");
      setImageUrl(product.image_url || "");
      setDetailsUrl(product.details_url || "");
      setWhatsappUrl(product.whatsapp_url || "");
      setDisplayOrder(product.display_order);
    } else {
      setTitle("");
      setDescription("");
      setImageUrl("");
      setDetailsUrl("");
      setWhatsappUrl("");
      setDisplayOrder(0);
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      details_url: detailsUrl.trim() || null,
      whatsapp_url: whatsappUrl.trim() || null,
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
      toast.error("Erro ao salvar produto");
      console.error(error);
    } else {
      toast.success(product ? "Produto atualizado!" : "Produto criado!");
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input placeholder="Ex: Mentoria Ames" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea placeholder="Descrição do produto" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL da Imagem</Label>
            <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
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
