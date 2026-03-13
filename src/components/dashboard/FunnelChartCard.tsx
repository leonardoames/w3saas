import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelChartCardProps {
  clicks: number;
  sessions: number;
  sales: number;
}

export function FunnelChartCard({ clicks, sessions, sales }: FunnelChartCardProps) {
  const safeClicks = Math.max(clicks, sessions, sales, 0);
  const safeSessions = Math.max(sessions, sales, 0);
  const checkout = Math.max(sales, Math.round(safeSessions * 0.22));
  const stageData = [
    { label: "Cliques", value: safeClicks },
    { label: "Sessões", value: safeSessions },
    { label: "Checkout", value: checkout },
    { label: "Compras", value: Math.max(sales, 0) },
  ];

  const top = stageData[0].value || 1;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Funil</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2 min-h-[180px]">
          {stageData.map((stage, idx) => {
            const pct = Math.max(8, Math.round((stage.value / top) * 100));
            return (
              <div key={stage.label} className="flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground text-center truncate">{stage.label}</p>
                <div className="h-36 rounded-md bg-primary/10 border border-primary/20 flex items-end justify-center p-2" style={{ clipPath: idx === stageData.length - 1 ? "none" : "polygon(0 0, 100% 6%, 100% 100%, 0 94%)" }}>
                  <div className="w-full bg-primary rounded-sm transition-all" style={{ height: `${pct}%` }} />
                </div>
                <p className="text-xs font-semibold text-foreground text-center">{stage.value.toLocaleString("pt-BR")}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
