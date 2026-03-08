import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categories: string[];
  onAdd: (values: { descricao: string; categoria: string; valor: number }) => void;
}

export function AddItemDialog({ open, onOpenChange, title, categories, onAdd }: Props) {
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");

  const reset = () => { setDescricao(""); setCategoria(""); setValor(""); };

  const handleSubmit = () => {
    if (!descricao || !categoria || !valor) return;
    onAdd({ descricao, categoria, valor: parseFloat(valor) || 0 });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input placeholder="Descrição do item" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor (R$)</label>
            <Input type="number" step="0.01" min="0" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!descricao || !categoria || !valor}>Adicionar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
