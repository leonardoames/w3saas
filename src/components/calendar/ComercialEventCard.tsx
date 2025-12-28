import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComercialEvent, getImpactColor, getImpactLabel } from "@/data/comercialEvents2026";
import { Calendar, Target, Lightbulb, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComercialEventCardProps {
  event: ComercialEvent;
}

export function ComercialEventCard({ event }: ComercialEventCardProps) {
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
  };

  const dateDisplay = event.dataFim 
    ? `${formatDate(event.dataInicio)} - ${formatDate(event.dataFim)}`
    : formatDate(event.dataInicio);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{event.nome}</CardTitle>
          <Badge className={getImpactColor(event.impacto)}>
            {getImpactLabel(event.impacto)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{dateDisplay}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {event.nichos.map((nicho) => (
            <Badge key={nicho} variant="secondary" className="text-xs">
              {nicho}
            </Badge>
          ))}
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">{event.insight}</p>
          </div>
          
          <div className="flex gap-2">
            <Target className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="font-medium">{event.dica}</p>
          </div>
          
          <div className="flex gap-2">
            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">Preparação: {event.preparacao}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
