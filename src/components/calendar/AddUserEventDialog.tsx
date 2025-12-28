import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface AddUserEventDialogProps {
  onAdd: (event: {
    nome: string;
    data_inicio: string;
    data_fim?: string;
    notas?: string;
    tipo: 'lancamento' | 'campanha' | 'liquidacao' | 'institucional';
  }) => void;
  selectedMonth: number;
}

export function AddUserEventDialog({ onAdd, selectedMonth }: AddUserEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [notas, setNotas] = useState("");
  const [tipo, setTipo] = useState<'lancamento' | 'campanha' | 'liquidacao' | 'institucional'>('campanha');

  const defaultDate = format(new Date(2026, selectedMonth, 1), 'yyyy-MM-dd');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !dataInicio) return;

    onAdd({
      nome,
      data_inicio: dataInicio,
      data_fim: dataFim || undefined,
      notas: notas || undefined,
      tipo
    });

    setNome("");
    setDataInicio("");
    setDataFim("");
    setNotas("");
    setTipo('campanha');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Evento Personalizado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Evento *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lançamento Coleção Verão"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início *</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                defaultValue={defaultDate}
                min="2026-01-01"
                max="2026-12-31"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim (opcional)</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio || "2026-01-01"}
                max="2026-12-31"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lancamento">Lançamento</SelectItem>
                <SelectItem value="campanha">Campanha</SelectItem>
                <SelectItem value="liquidacao">Liquidação</SelectItem>
                <SelectItem value="institucional">Institucional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações sobre o evento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
