import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CalendarMonthSelector } from "@/components/calendar/CalendarMonthSelector";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ComercialEventCard } from "@/components/calendar/ComercialEventCard";
import { UserEventCard, UserEvent } from "@/components/calendar/UserEventCard";
import { AddUserEventDialog } from "@/components/calendar/AddUserEventDialog";
import { getEventsForMonth } from "@/data/comercialEvents2026";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User } from "lucide-react";

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CalendarioComercial() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month if 2026, otherwise January
    const now = new Date();
    return now.getFullYear() === 2026 ? now.getMonth() : 0;
  });
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const comercialEvents = getEventsForMonth(selectedMonth);

  // Filter user events for selected month
  const userEventsForMonth = userEvents.filter(event => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const startMonth = event.data_inicio.substring(5, 7);
    const endMonth = event.data_fim?.substring(5, 7);
    
    if (startMonth === monthStr) return true;
    if (endMonth === monthStr) return true;
    
    if (event.data_fim) {
      const start = parseInt(event.data_inicio.substring(5, 7));
      const end = parseInt(event.data_fim.substring(5, 7));
      const current = selectedMonth + 1;
      if (current >= start && current <= end) return true;
    }
    
    return false;
  });

  useEffect(() => {
    fetchUserEvents();
  }, []);

  const fetchUserEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('data_inicio', { ascending: true });

      if (error) throw error;
      
      setUserEvents(data?.map(e => ({
        id: e.id,
        nome: e.nome,
        data_inicio: e.data_inicio,
        data_fim: e.data_fim,
        notas: e.notas,
        tipo: e.tipo as UserEvent['tipo']
      })) || []);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (event: {
    nome: string;
    data_inicio: string;
    data_fim?: string;
    notas?: string;
    tipo: 'lancamento' | 'campanha' | 'liquidacao' | 'institucional';
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar eventos.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('user_calendar_events')
        .insert({
          user_id: user.id,
          nome: event.nome,
          data_inicio: event.data_inicio,
          data_fim: event.data_fim || null,
          notas: event.notas || null,
          tipo: event.tipo
        })
        .select()
        .single();

      if (error) throw error;

      setUserEvents(prev => [...prev, {
        id: data.id,
        nome: data.nome,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        notas: data.notas,
        tipo: data.tipo as UserEvent['tipo']
      }]);

      toast({
        title: "Evento adicionado",
        description: "Seu evento foi adicionado ao calendário."
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o evento.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUserEvents(prev => prev.filter(e => e.id !== id));

      toast({
        title: "Evento removido",
        description: "O evento foi removido do calendário."
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o evento.",
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário Comercial 2026</h1>
            <p className="text-muted-foreground mt-1">
              Planejamento mensal para e-commerce brasileiro
            </p>
          </div>
          <AddUserEventDialog onAdd={handleAddEvent} selectedMonth={selectedMonth} />
        </div>

        <CalendarMonthSelector 
          selectedMonth={selectedMonth} 
          onMonthChange={setSelectedMonth} 
        />

        <CalendarGrid 
          selectedMonth={selectedMonth} 
          userEvents={userEvents}
        />

        <div className="space-y-6">
          {/* System Events */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                Eventos Comerciais - {MONTH_NAMES[selectedMonth]} 2026
              </h2>
            </div>
            {comercialEvents.length === 0 ? (
              <p className="text-muted-foreground">Nenhum evento comercial neste mês.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {comercialEvents.map(event => (
                  <ComercialEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* User Events */}
          {userEventsForMonth.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    Seus Eventos - {MONTH_NAMES[selectedMonth]} 2026
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {userEventsForMonth.map(event => (
                    <UserEventCard 
                      key={event.id} 
                      event={event} 
                      onDelete={handleDeleteEvent}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
