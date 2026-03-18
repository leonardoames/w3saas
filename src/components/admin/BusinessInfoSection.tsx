import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, Phone, Save } from "lucide-react";

interface BusinessFields {
  phone: string;
  cnpj: string;
  nome_negocio: string;
  loja_online_url: string;
  loja_shopee_url: string;
  loja_mercado_livre_url: string;
  loja_shein_url: string;
  loja_temu_url: string;
}

const EMPTY: BusinessFields = {
  phone: "", cnpj: "", nome_negocio: "",
  loja_online_url: "", loja_shopee_url: "",
  loja_mercado_livre_url: "", loja_shein_url: "", loja_temu_url: "",
};

const STORE_LINKS: { key: keyof BusinessFields; label: string }[] = [
  { key: "loja_online_url", label: "Loja online" },
  { key: "loja_shopee_url", label: "Shopee" },
  { key: "loja_mercado_livre_url", label: "Mercado Livre" },
  { key: "loja_shein_url", label: "Shein" },
  { key: "loja_temu_url", label: "Temu" },
];

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

interface Props {
  userId: string;
  canEdit: boolean;
  compact?: boolean;
}

export function BusinessInfoSection({ userId, canEdit, compact }: Props) {
  const { toast } = useToast();
  const [fields, setFields] = useState<BusinessFields>(EMPTY);
  const [draft, setDraft] = useState<BusinessFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles" as any)
      .select("phone, cnpj, nome_negocio, loja_online_url, loja_shopee_url, loja_mercado_livre_url, loja_shein_url, loja_temu_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const vals: BusinessFields = {
          phone: data?.phone || "",
          cnpj: data?.cnpj || "",
          nome_negocio: data?.nome_negocio || "",
          loja_online_url: data?.loja_online_url || "",
          loja_shopee_url: data?.loja_shopee_url || "",
          loja_mercado_livre_url: data?.loja_mercado_livre_url || "",
          loja_shein_url: data?.loja_shein_url || "",
          loja_temu_url: data?.loja_temu_url || "",
        };
        setFields(vals);
        setDraft(vals);
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      phone: draft.phone || null,
      cnpj: draft.cnpj || null,
      nome_negocio: draft.nome_negocio || null,
      loja_online_url: draft.loja_online_url || null,
      loja_shopee_url: draft.loja_shopee_url || null,
      loja_mercado_livre_url: draft.loja_mercado_livre_url || null,
      loja_shein_url: draft.loja_shein_url || null,
      loja_temu_url: draft.loja_temu_url || null,
    }).eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setFields({ ...draft });
      setEditing(false);
      toast({ title: "Dados salvos" });
    }
  };

  const set = (k: keyof BusinessFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [k]: e.target.value }));

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  const hasAnyData = Object.values(fields).some(Boolean);

  // Read-only view
  if (!editing || !canEdit) {
    if (!hasAnyData && !canEdit) return null;
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {canEdit && !editing && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados do Negócio</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditing(true)}>
              Editar
            </Button>
          </div>
        )}

        {!hasAnyData ? (
          <p className="text-xs text-muted-foreground italic">Nenhum dado preenchido.</p>
        ) : (
          <div className={compact ? "grid grid-cols-2 gap-2 text-sm" : "space-y-2 text-sm"}>
            {fields.nome_negocio && (
              <div><span className="text-muted-foreground text-xs">Negócio: </span><span className="font-medium">{fields.nome_negocio}</span></div>
            )}
            {fields.cnpj && (
              <div><span className="text-muted-foreground text-xs">CNPJ: </span><span className="font-mono text-xs">{fields.cnpj}</span></div>
            )}
            {fields.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <a href={whatsappUrl(fields.phone)} target="_blank" rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:underline text-xs font-medium">
                  {fields.phone}
                </a>
              </div>
            )}
            {STORE_LINKS.filter(l => fields[l.key]).length > 0 && (
              <div className={compact ? "col-span-2 flex flex-wrap gap-1.5" : "flex flex-wrap gap-1.5 pt-1"}>
                {STORE_LINKS.filter(l => fields[l.key]).map(l => (
                  <a key={l.key} href={fields[l.key]} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-muted/40 hover:bg-muted text-foreground hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados do Negócio</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setDraft(fields); setEditing(false); }}>
          Cancelar
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nome do negócio</Label>
          <Input value={draft.nome_negocio} onChange={set("nome_negocio")} placeholder="Ex: Minha Loja" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CNPJ</Label>
          <Input value={draft.cnpj} onChange={set("cnpj")} placeholder="XX.XXX.XXX/XXXX-XX" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Telefone / WhatsApp</Label>
          <Input value={draft.phone} onChange={set("phone")} placeholder="(11) 99999-9999" className="h-8 text-sm" />
        </div>
        {STORE_LINKS.map(l => (
          <div key={l.key} className="space-y-1">
            <Label className="text-xs">{l.label}</Label>
            <Input value={draft[l.key]} onChange={set(l.key)} placeholder="https://..." className="h-8 text-sm" />
          </div>
        ))}
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
        Salvar
      </Button>
    </div>
  );
}
