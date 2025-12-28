import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface UserEvent {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim?: string | null;
  notas?: string | null;
  tipo: 'lancamento' | 'campanha' | 'liquidacao' | 'institucional';
}

interface UserEventCardProps {
  event: UserEvent;
  onDelete: (id: string) => void;
}

const TIPO_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  campanha: 'Campanha',
  liquidacao: 'Liquidação',
  institucional: 'Institucional'
};

const TIPO_COLORS: Record<string, string> = {
  lancamento: 'bg-purple-500 text-white',
  campanha: 'bg-blue-500 text-white',
  liquidacao: 'bg-red-500 text-white',
  institucional: 'bg-gray-500 text-white'
};

export function UserEventCard({ event, onDelete }: UserEventCardProps) {
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
  };

  const dateDisplay = event.data_fim 
    ? `${formatDate(event.data_inicio)} - ${formatDate(event.data_fim)}`
    : formatDate(event.data_inicio);

  return (
    <Card className="hover:shadow-md transition-shadow border-dashed border-2 border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg font-semibold">{event.nome}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={TIPO_COLORS[event.tipo]}>
              {TIPO_LABELS[event.tipo]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Personalizado
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{dateDisplay}</span>
        </div>
      </CardHeader>
      {event.notas && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{event.notas}</p>
        </CardContent>
      )}
      <CardContent className="pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(event.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remover
        </Button>
      </CardContent>
    </Card>
  );
}
