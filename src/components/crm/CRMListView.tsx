import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Clock } from "lucide-react";
import { HealthScoreBadge, getHealthScoreInfo } from "./HealthScoreBadge";
import { MiniSparkline } from "./MiniSparkline";
import type { CRMCardExtended } from "./types";
import { CRM_STAGES } from "./CRMClientDrawer";

type SortKey = "name" | "stage" | "health" | "cs" | "nextContact" | "lastAudit" | "planPct" | "sla";
type SortDir = "asc" | "desc";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};

interface CRMListViewProps {
  cards: CRMCardExtended[];
  search: string;
  onCardClick: (userId: string) => void;
}

function SortHeader({
  label, col, current, dir, onClick,
}: {
  label: string; col: SortKey; current: SortKey; dir: SortDir; onClick: (c: SortKey) => void;
}) {
  const active = current === col;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => onClick(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

export function CRMListView({ cards, search, onCardClick }: CRMListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("health");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = cards;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nomeLoja?.toLowerCase().includes(q) ||
        c.fullName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.csName?.toLowerCase().includes(q)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":  return dir * ((a.nomeLoja || a.fullName || "").localeCompare(b.nomeLoja || b.fullName || ""));
        case "stage": return dir * (a.stage.localeCompare(b.stage));
        case "health": return dir * (a.healthScore - b.healthScore);
        case "cs":    return dir * ((a.csName || "").localeCompare(b.csName || ""));
        case "nextContact": {
          const av = a.nextContactDate || "9999";
          const bv = b.nextContactDate || "9999";
          return dir * av.localeCompare(bv);
        }
        case "lastAudit": return dir * ((a.lastAuditFaturamento ?? 0) - (b.lastAuditFaturamento ?? 0));
        case "planPct": {
          const ap = a.totalTasks > 0 ? a.completedTasks / a.totalTasks : 0;
          const bp = b.totalTasks > 0 ? b.completedTasks / b.totalTasks : 0;
          return dir * (ap - bp);
        }
        case "sla": {
          const av = a.slaExceeded ? 0 : 1;
          const bv = b.slaExceeded ? 0 : 1;
          return dir * (av - bv);
        }
        default: return 0;
      }
    });
  }, [cards, search, sortKey, sortDir]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <SortHeader label="Nome / Marca" col="name"        current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Stage"        col="stage"       current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Health"       col="health"      current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="CS"           col="cs"          current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Próx. Contato" col="nextContact" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="Últ. Audit."  col="lastAudit"   current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="% Plano"      col="planPct"     current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHeader label="SLA"          col="sla"         current={sortKey} dir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((card, i) => {
              const info = getHealthScoreInfo(card.healthScore);
              const stageInfo = CRM_STAGES.find(s => s.id === card.stage);
              const planPct = card.totalTasks > 0 ? Math.round((card.completedTasks / card.totalTasks) * 100) : null;
              const contactOverdue = card.nextContactDate && card.nextContactDate < today;
              const rowHighlight = card.slaExceeded || contactOverdue
                ? "bg-red-50/60 dark:bg-red-950/20"
                : i % 2 === 0 ? "bg-card" : "bg-muted/20";

              return (
                <tr
                  key={card.userId}
                  className={`border-t cursor-pointer hover:bg-muted/30 transition-colors ${rowHighlight}`}
                  onClick={() => onCardClick(card.userId)}
                >
                  {/* Name */}
                  <td className="px-3 py-2.5">
                    <div className={`flex items-center gap-2 border-l-2 pl-2 ${info.borderColor}`}>
                      {card.site && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${card.site}&sz=16`}
                          alt="" className="h-4 w-4 rounded-sm shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px]">
                          {card.nomeLoja || card.fullName || card.email || "—"}
                        </p>
                        {card.nomeLoja && card.fullName && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{card.fullName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="px-3 py-2.5">
                    {stageInfo && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${stageInfo.text}`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${stageInfo.dot}`} />
                        {stageInfo.label}
                      </span>
                    )}
                  </td>

                  {/* Health */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <HealthScoreBadge score={card.healthScore} size="sm" />
                      {card.sparkline.length >= 2 && (
                        <MiniSparkline values={card.sparkline} />
                      )}
                    </div>
                  </td>

                  {/* CS */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{card.csName || "—"}</span>
                  </td>

                  {/* Next contact */}
                  <td className="px-3 py-2.5">
                    {card.nextContactDate ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${contactOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {new Date(card.nextContactDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        {contactOverdue && <Clock className="h-3 w-3" />}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Last audit faturamento */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium">{formatCurrency(card.lastAuditFaturamento)}</span>
                  </td>

                  {/* Plan % */}
                  <td className="px-3 py-2.5">
                    {planPct !== null ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${planPct === 100 ? "bg-green-500" : "bg-primary"}`}
                            style={{ width: `${planPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{planPct}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* SLA */}
                  <td className="px-3 py-2.5">
                    {card.slaLabel ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${card.slaExceeded ? "text-destructive" : "text-muted-foreground"}`}>
                        {card.slaLabel}
                        {card.slaExceeded && <AlertTriangle className="h-3 w-3" />}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </div>
    </div>
  );
}
