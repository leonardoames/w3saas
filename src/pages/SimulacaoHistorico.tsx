import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

interface SavedScenario {
  id: string;
  name: string;
  current_visits: number;
  current_rate: number;
  current_ticket: number;
  new_visits: number;
  new_rate: number;
  new_ticket: number;
  created_at: string;
}

export default function SimulacaoHistorico() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScenarios = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("saved_scenarios" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setScenarios(data as any);
    setLoading(false);
  };

  useEffect(() => { loadScenarios(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_scenarios" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Cenário excluído");
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleLoad = (s: SavedScenario) => {
    // Navigate to simulation page with state
    navigate("/app/simulacao", {
      state: {
        currentScenario: { monthlyVisits: String(s.current_visits), conversionRate: String(s.current_rate), averageTicket: String(s.current_ticket) },
        newScenario: { monthlyVisits: String(s.new_visits), conversionRate: String(s.new_rate), averageTicket: String(s.new_ticket) },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/app/simulacao")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Simulação
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Cenários</h1>
          <p className="text-muted-foreground mt-1">Cenários simulados salvos anteriormente.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : scenarios.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cenário salvo ainda.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Visitas (Atual)</TableHead>
                <TableHead className="text-right">Visitas (Novo)</TableHead>
                <TableHead className="text-right">Conv. (Atual)</TableHead>
                <TableHead className="text-right">Conv. (Novo)</TableHead>
                <TableHead className="text-right">Ticket (Atual)</TableHead>
                <TableHead className="text-right">Ticket (Novo)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{format(parseISO(s.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right">{Number(s.current_visits).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(s.new_visits).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(s.current_rate).toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{Number(s.new_rate).toFixed(1)}%</TableCell>
                  <TableCell className="text-right">R$ {Number(s.current_ticket).toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {Number(s.new_ticket).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleLoad(s)} title="Carregar">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
