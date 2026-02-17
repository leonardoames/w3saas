import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScenarioInputs } from "./ScenarioCard";

interface SaveScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScenario: ScenarioInputs;
  newScenario: ScenarioInputs;
}

export function SaveScenarioDialog({ open, onOpenChange, currentScenario, newScenario }: SaveScenarioDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do cenário é obrigatório");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("saved_scenarios" as any).insert({
      user_id: user.id,
      name: name.trim(),
      current_visits: parseFloat(currentScenario.monthlyVisits) || 0,
      current_rate: parseFloat(currentScenario.conversionRate) || 0,
      current_ticket: parseFloat(currentScenario.averageTicket) || 0,
      new_visits: parseFloat(newScenario.monthlyVisits) || 0,
      new_rate: parseFloat(newScenario.conversionRate) || 0,
      new_ticket: parseFloat(newScenario.averageTicket) || 0,
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar cenário");
    } else {
      toast.success("Cenário salvo!");
      onOpenChange(false);
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Cenário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Cenário *</Label>
            <Input placeholder="Ex: Black Friday 2026" value={name} onChange={(e) => setName(e.target.value)} />
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
