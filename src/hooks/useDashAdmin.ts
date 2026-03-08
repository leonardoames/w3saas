import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subMonths, isAfter, isBefore, addDays, parseISO, differenceInDays, startOfMonth } from "date-fns";

export interface MentoradoRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  access_status: string;
  plan_type: string;
  is_mentorado: boolean;
  is_w3_client: boolean;
  access_expires_at: string | null;
  created_at: string;
  last_login_at: string | null;
  revenue_goal: number | null;
  must_change_password: boolean;
  total_faturamento?: number;
  total_sessoes?: number;
  total_investimento?: number;
  total_pedidos?: number;
  // monthly revenue for trend
  revenue_this_month?: number;
  revenue_last_month?: number;
}

export type PeriodFilter = "7" | "30" | "90" | "all" | "custom";
export type EngagementFilter = "all" | "active_recent" | "inactive_15d" | "never_logged";

export interface DashAdminFilters {
  period: PeriodFilter;
  customStart?: string;
  customEnd?: string;
  status: string;
  search: string;
  engagement: EngagementFilter;
}

const ITEMS_PER_PAGE = 20;

export function useDashAdmin() {
  const [filters, setFilters] = useState<DashAdminFilters>({
    period: "all",
    status: "all",
    search: "",
    engagement: "all",
  });
  const [page, setPage] = useState(0);

  const profilesQuery = useQuery({
    queryKey: ["dash-admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_mentorado", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MentoradoRow[];
    },
  });

  // Fetch daily_results with date for monthly breakdown
  const revenueQuery = useQuery({
    queryKey: ["dash-admin-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("user_id, receita_paga, sessoes, investimento, pedidos_pagos, data");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch metrics_diarias (integration data) for complete revenue picture
  const metricsQuery = useQuery({
    queryKey: ["dash-admin-metrics-diarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_diarias")
        .select("user_id, faturamento, sessoes, investimento_trafego, vendas_quantidade, vendas_valor, data");
      if (error) throw error;
      return data || [];
    },
  });

  const now = useMemo(() => new Date(), []);
  const thisMonthStart = useMemo(() => startOfMonth(now), [now]);
  const lastMonthStart = useMemo(() => startOfMonth(subMonths(now, 1)), [now]);

  // Aggregate revenue data from both daily_results AND metrics_diarias
  const revenueAgg = useMemo(() => {
    const dailyRows = Array.isArray(revenueQuery.data) ? revenueQuery.data : [];
    const metricsRows = Array.isArray(metricsQuery.data) ? metricsQuery.data : [];
    const agg: Record<string, {
      faturamento: number; sessoes: number; investimento: number; pedidos: number;
      revenueThisMonth: number; revenueLastMonth: number;
    }> = {};

    const ensureUser = (uid: string) => {
      if (!agg[uid]) {
        agg[uid] = { faturamento: 0, sessoes: 0, investimento: 0, pedidos: 0, revenueThisMonth: 0, revenueLastMonth: 0 };
      }
    };

    // Process daily_results
    for (const row of dailyRows) {
      ensureUser(row.user_id);
      const a = agg[row.user_id];
      const val = Number(row.receita_paga || 0);
      a.faturamento += val;
      a.sessoes += Number(row.sessoes || 0);
      a.investimento += Number(row.investimento || 0);
      a.pedidos += Number(row.pedidos_pagos || 0);

      if (row.data) {
        const d = parseISO(String(row.data).slice(0, 10));
        if (!isBefore(d, thisMonthStart)) {
          a.revenueThisMonth += val;
        } else if (!isBefore(d, lastMonthStart) && isBefore(d, thisMonthStart)) {
          a.revenueLastMonth += val;
        }
      }
    }

    // Process metrics_diarias (integration data)
    for (const row of metricsRows) {
      ensureUser(row.user_id);
      const a = agg[row.user_id];
      const val = Number(row.faturamento || 0) + Number(row.vendas_valor || 0);
      a.faturamento += val;
      a.sessoes += Number(row.sessoes || 0);
      a.investimento += Number(row.investimento_trafego || 0);
      a.pedidos += Number(row.vendas_quantidade || 0);

      if (row.data) {
        const d = parseISO(String(row.data).slice(0, 10));
        if (!isBefore(d, thisMonthStart)) {
          a.revenueThisMonth += val;
        } else if (!isBefore(d, lastMonthStart) && isBefore(d, thisMonthStart)) {
          a.revenueLastMonth += val;
        }
      }
    }

    return agg;
  }, [revenueQuery.data, metricsQuery.data, thisMonthStart, lastMonthStart]);

  // Merge profiles with revenue
  const mentorados = useMemo(() => {
    if (!profilesQuery.data) return [];
    return profilesQuery.data.map((p) => {
      const rev = revenueAgg[p.user_id];
      return {
        ...p,
        total_faturamento: rev?.faturamento || 0,
        total_sessoes: rev?.sessoes || 0,
        total_investimento: rev?.investimento || 0,
        total_pedidos: rev?.pedidos || 0,
        revenue_this_month: rev?.revenueThisMonth || 0,
        revenue_last_month: rev?.revenueLastMonth || 0,
      };
    });
  }, [profilesQuery.data, revenueAgg]);

  const allColumns = useMemo(() => {
    if (mentorados.length === 0) return [];
    const exclude = ["id", "must_change_password", "revenue_this_month", "revenue_last_month"];
    return Object.keys(mentorados[0]).filter((k) => !exclude.includes(k));
  }, [mentorados]);

  // Filter
  const filtered = useMemo(() => {
    let result = [...mentorados];

    if (filters.period !== "all" && filters.period !== "custom") {
      const days = parseInt(filters.period);
      const cutoff = subDays(now, days);
      result = result.filter((m) => isAfter(parseISO(m.created_at), cutoff));
    }
    if (filters.period === "custom" && filters.customStart) {
      const start = parseISO(filters.customStart);
      result = result.filter((m) => isAfter(parseISO(m.created_at), start));
    }
    if (filters.period === "custom" && filters.customEnd) {
      const end = parseISO(filters.customEnd);
      result = result.filter((m) => isBefore(parseISO(m.created_at), addDays(end, 1)));
    }

    if (filters.status !== "all") {
      if (filters.status === "expiring") {
        const in7 = addDays(now, 7);
        result = result.filter((m) => m.access_expires_at && isBefore(parseISO(m.access_expires_at), in7) && isAfter(parseISO(m.access_expires_at), now));
      } else {
        result = result.filter((m) => m.access_status === filters.status);
      }
    }

    // Engagement filter
    if (filters.engagement === "active_recent") {
      const d7 = subDays(now, 7);
      result = result.filter((m) => m.last_login_at && isAfter(parseISO(m.last_login_at), d7));
    } else if (filters.engagement === "inactive_15d") {
      const d15 = subDays(now, 15);
      result = result.filter((m) => m.last_login_at && isBefore(parseISO(m.last_login_at), d15));
    } else if (filters.engagement === "never_logged") {
      result = result.filter((m) => !m.last_login_at);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          (m.full_name || "").toLowerCase().includes(s) ||
          (m.email || "").toLowerCase().includes(s) ||
          m.plan_type.toLowerCase().includes(s)
      );
    }

    return result;
  }, [mentorados, filters, now]);

  // KPIs
  const kpis = useMemo(() => {
    const in30 = addDays(now, 30);
    const last30 = subDays(now, 30);
    const in7 = addDays(now, 7);
    const d7 = subDays(now, 7);
    const d15 = subDays(now, 15);

    const total = mentorados.length;
    const active = mentorados.filter((m) => m.access_status === "active").length;
    const newRecent = mentorados.filter((m) => isAfter(parseISO(m.created_at), last30)).length;
    const expiringSoon = mentorados.filter(
      (m) => m.access_expires_at && isBefore(parseISO(m.access_expires_at), in30) && isAfter(parseISO(m.access_expires_at), now)
    ).length;
    const expiring7d = mentorados.filter(
      (m) => m.access_expires_at && isBefore(parseISO(m.access_expires_at), in7) && isAfter(parseISO(m.access_expires_at), now)
    ).length;
    const totalRev = mentorados.reduce((s, m) => s + (m.total_faturamento || 0), 0);
    const avgRev = active > 0 ? totalRev / active : 0;

    // Engagement: logged in last 7 days
    const activeRecent = mentorados.filter((m) => m.last_login_at && isAfter(parseISO(m.last_login_at), d7)).length;
    const engagementRate = active > 0 ? (activeRecent / active) * 100 : 0;

    // Alerts
    const inactive15d = mentorados.filter((m) => m.last_login_at && isBefore(parseISO(m.last_login_at), d15) && m.access_status === "active").length;
    const neverRevenue = mentorados.filter((m) => (m.total_faturamento || 0) === 0 && m.access_status === "active").length;

    return {
      total, active, newRecent, expiringSoon, expiring7d, totalRev, avgRev, hasRevenue: totalRev > 0,
      engagementRate, activeRecent, inactive15d, neverRevenue,
    };
  }, [mentorados, now]);

  // Monthly revenue chart (last 6 months) - combining both sources
  const monthlyRevenue = useMemo(() => {
    const dailyRows = Array.isArray(revenueQuery.data) ? revenueQuery.data : [];
    const metricsRows = Array.isArray(metricsQuery.data) ? metricsQuery.data : [];
    const monthMap: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const m = format(subMonths(now, i), "yyyy-MM");
      monthMap[m] = 0;
    }

    for (const row of dailyRows) {
      if (!row.data) continue;
      const month = String(row.data).slice(0, 7);
      if (month in monthMap) {
        monthMap[month] += Number(row.receita_paga || 0);
      }
    }

    for (const row of metricsRows) {
      if (!row.data) continue;
      const month = String(row.data).slice(0, 7);
      if (month in monthMap) {
        monthMap[month] += Number(row.faturamento || 0) + Number(row.vendas_valor || 0);
      }
    }

    return Object.entries(monthMap).map(([month, total]) => ({
      month: format(parseISO(month + "-01"), "MMM/yy"),
      total,
    }));
  }, [revenueQuery.data, metricsQuery.data, now]);

  // Top 5 mentorados by revenue
  const top5 = useMemo(() => {
    return [...mentorados]
      .sort((a, b) => (b.total_faturamento || 0) - (a.total_faturamento || 0))
      .slice(0, 5)
      .map((m) => ({
        name: m.full_name || m.email || "Sem nome",
        revenue: m.total_faturamento || 0,
      }));
  }, [mentorados]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Keep chartData for backward compat but we won't use it
  const chartData = useMemo(() => ({ entries: [], expirations: [], statusDistribution: [] }), []);

  const exportCSV = useCallback(
    (visibleColumns: string[]) => {
      const header = visibleColumns.join(",");
      const rows = filtered.map((m) =>
        visibleColumns
          .map((col) => {
            const val = (m as any)[col];
            if (val === null || val === undefined) return "";
            const str = String(val);
            return str.includes(",") ? `"${str}"` : str;
          })
          .join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dash-admin-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [filtered]
  );

  return {
    mentorados: filtered,
    allMentorados: mentorados,
    paginated,
    page,
    setPage,
    totalPages,
    filters,
    setFilters,
    kpis,
    chartData,
    monthlyRevenue,
    top5,
    allColumns,
    exportCSV,
    isLoading: profilesQuery.isLoading || revenueQuery.isLoading || metricsQuery.isLoading,
  };
}
