import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Save } from "lucide-react";

export function AdminWhatsAppConfig() {
  const [number, setNumber] = useState("");
  const [settingId, setSettingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("id, value")
        .eq("key", "whatsapp_number")
        .maybeSingle();
      if (data) {
        setNumber(data.value);
        setSettingId(data.id);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned && (cleaned.length < 10 || cleaned.length > 15)) {
      toast.error("Número inválido. Use formato: 5511999999999");
      return;
    }
    setSaving(true);

    let error;
    if (settingId) {
      ({ error } = await (supabase as any)
        .from("app_settings")
        .update({ value: cleaned })
        .eq("id", settingId));
    } else if (cleaned) {
      const { data, error: insertError } = await (supabase as any)
        .from("app_settings")
        .insert({ key: "whatsapp_number", value: cleaned })
        .select("id")
        .single();
      error = insertError;
      if (data) setSettingId(data.id);
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar número");
    } else {
      setNumber(cleaned);
      toast.success("Número do WhatsApp atualizado!");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-section-title text-foreground">WhatsApp de Suporte</h3>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-caption text-muted-foreground">Número (somente dígitos)</Label>
          <Input
            placeholder="5511999999999"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="h-10">
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground opacity-60">
        Este número aparecerá no botão flutuante de WhatsApp para todos os usuários (exceto admins).
      </p>
    </div>
  );
}
