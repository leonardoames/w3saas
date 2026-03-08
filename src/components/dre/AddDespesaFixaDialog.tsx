import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FIXED_EXPENSE_PRESETS } from "./dreConstants";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (values: { descricao: string; categoria: string; valor: number }) => void;
}

export function AddDespesaFixaDialog({ open, onOpenChange, onAdd }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [valor, setValor] = useState("");

  const reset = () => {
    setSelectedCategory("");
    setSelectedItem("");
    setCustomItem("");
    setValor("");
  };

  const handleSubmit = () => {
    const descricao = selectedItem || customItem;
    if (!descricao || !selectedCategory || !valor) return;
    onAdd({ descricao, categoria: selectedCategory, valor: parseFloat(valor) || 0 });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Despesa Fixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecione uma despesa pré-definida ou crie uma personalizada:</p>

          <Accordion type="single" collapsible className="w-full">
            {FIXED_EXPENSE_PRESETS.map((group) => (
              <AccordionItem key={group.categoria} value={group.categoria}>
                <AccordionTrigger className="text-sm font-medium py-2">{group.categoria}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => { setSelectedCategory(group.categoria); setSelectedItem(item); setCustomItem(""); }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-accent",
                          selectedItem === item && selectedCategory === group.categoria && "bg-primary/10 text-primary"
                        )}
                      >
                        {selectedItem === item && selectedCategory === group.categoria && <Check className="h-3.5 w-3.5 shrink-0" />}
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {selectedItem && (
            <div className="rounded-lg bg-accent/50 p-3 text-sm">
              <span className="text-muted-foreground">Selecionado:</span> {selectedItem}{" "}
              <span className="text-muted-foreground">({selectedCategory})</span>
            </div>
          )}

          {!selectedItem && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ou digite uma descrição personalizada:</label>
              <Input
                placeholder="Ex: Seguro empresarial"
                value={customItem}
                onChange={(e) => { setCustomItem(e.target.value); setSelectedItem(""); setSelectedCategory("Outros"); }}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Valor mensal (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!(selectedItem || customItem) || !valor}>Adicionar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
