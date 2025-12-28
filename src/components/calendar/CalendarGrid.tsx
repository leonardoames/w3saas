import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ComercialEvent, COMERCIAL_EVENTS_2026 } from "@/data/comercialEvents2026";
import { UserEvent } from "./UserEventCard";
import { Badge } from "@/components/ui/badge";

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CalendarGridProps {
  selectedMonth: number;
  userEvents: UserEvent[];
  onDayClick?: (day: number) => void;
}

export function CalendarGrid({ selectedMonth, userEvents, onDayClick }: CalendarGridProps) {
  const today = new Date();
  const isCurrentYear2026 = today.getFullYear() === 2026;
  const currentDay = isCurrentYear2026 && today.getMonth() === selectedMonth ? today.getDate() : null;

  const calendarData = useMemo(() => {
    const year = 2026;
    const firstDay = new Date(year, selectedMonth, 1);
    const lastDay = new Date(year, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: Array<{ day: number | null; events: Array<{ type: 'system' | 'user'; name: string; color: string }> }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, events: [] });
    }

    // Add days of the month with events
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents: Array<{ type: 'system' | 'user'; name: string; color: string }> = [];

      // Check system events
      COMERCIAL_EVENTS_2026.forEach(event => {
        const startDate = event.dataInicio;
        const endDate = event.dataFim || event.dataInicio;
        
        if (dateStr >= startDate && dateStr <= endDate) {
          let color = 'bg-gray-400';
          if (event.impacto === 'muito-alto') color = 'bg-red-500';
          else if (event.impacto === 'alto') color = 'bg-orange-500';
          else if (event.impacto === 'medio') color = 'bg-yellow-500';
          
          dayEvents.push({ type: 'system', name: event.nome, color });
        }
      });

      // Check user events
      userEvents.forEach(event => {
        const startDate = event.data_inicio;
        const endDate = event.data_fim || event.data_inicio;
        
        if (dateStr >= startDate && dateStr <= endDate) {
          let color = 'bg-blue-500';
          if (event.tipo === 'lancamento') color = 'bg-purple-500';
          else if (event.tipo === 'liquidacao') color = 'bg-red-400';
          else if (event.tipo === 'institucional') color = 'bg-gray-500';
          
          dayEvents.push({ type: 'user', name: event.nome, color });
        }
      });

      days.push({ day, events: dayEvents });
    }

    return days;
  }, [selectedMonth, userEvents]);

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((cell, index) => (
          <div
            key={index}
            onClick={() => cell.day && onDayClick?.(cell.day)}
            className={cn(
              "min-h-[80px] p-1 rounded-md border transition-colors",
              cell.day ? "bg-background hover:bg-muted/50 cursor-pointer" : "bg-muted/20",
              cell.day === currentDay && "ring-2 ring-primary"
            )}
          >
            {cell.day && (
              <>
                <div className={cn(
                  "text-sm font-medium mb-1",
                  cell.day === currentDay && "text-primary font-bold"
                )}>
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {cell.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate text-white",
                        event.color
                      )}
                      title={event.name}
                    >
                      {event.name}
                    </div>
                  ))}
                  {cell.events.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{cell.events.length - 3} mais
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
