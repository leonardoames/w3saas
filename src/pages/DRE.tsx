import { useState, useRef } from "react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, Settings, BarChart3, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDRE } from "@/hooks/useDRE";
import { DREStatement } from "@/components/dre/DREStatement";
import { DREConfigPanel } from "@/components/dre/DREConfigPanel";

export default function DRE() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = isAdmin ? searchParams.get("userId") || undefined : undefined;
  const isViewingOther = !!targetUserId && targetUserId !== user?.id;

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [showComparison, setShowComparison] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  const dre = useDRE(selectedMonth, targetUserId);

  // Fetch target user name for admin banner
  const { data: targetProfile } = useQuery({
    queryKey: ["profile-name", targetUserId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, email").eq("user_id", targetUserId!).maybeSingle();
      return data;
    },
    enabled: isViewingOther,
  });

  const scrollToConfig = () => {
    configRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (dre.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Empty state
  if (!dre.isConfigured && !isViewingOther) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">DRE — Demonstrativo de Resultado</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe seu resultado real com visão mensal consolidada</p>
        </div>
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-xl font-semibold">Configure seu DRE</h2>
              <p className="text-muted-foreground text-sm">
                Veja seu lucro real calculado automaticamente em 3 passos simples:
              </p>
            </div>
            <div className="grid gap-4 w-full max-w-sm">
              {[
                { icon: Settings, step: "1", text: "Configure seus percentuais variáveis (CMV, impostos, taxas, frete)" },
                { icon: Building2, step: "2", text: "Cadastre seus custos fixos mensais" },
                { icon: BarChart3, step: "3", text: "Veja seu lucro real calculado automaticamente" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {item.step}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
            <Button onClick={scrollToConfig} className="mt-2">Configurar agora</Button>
          </CardContent>
        </Card>
        <div ref={configRef}>
          <DREConfigPanel dre={dre} readOnly={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">DRE — Demonstrativo de Resultado</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe seu resultado real com visão mensal consolidada</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showComparison} onCheckedChange={setShowComparison} />
            <span className="text-xs text-muted-foreground">Comparar com mês anterior</span>
          </div>
        </div>
      </div>

      {/* Admin banner */}
      {isViewingOther && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-500">
            Visualizando DRE de <strong>{targetProfile?.full_name || targetProfile?.email || targetUserId}</strong> (somente leitura)
          </span>
        </div>
      )}

      {/* DRE Statement */}
      <div className="overflow-x-auto">
        <DREStatement dre={dre} showComparison={showComparison} selectedMonth={selectedMonth} readOnly={isViewingOther} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Automático = dados puxados das suas integrações
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" /> Manual = valores que você configurou
        </span>
      </div>

      {/* Config Panel */}
      <div ref={configRef}>
        <DREConfigPanel dre={dre} readOnly={isViewingOther} />
      </div>
    </div>
  );
}
