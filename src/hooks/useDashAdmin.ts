import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter, isBefore, addDays, parseISO } from "date-fns";

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
  // aggregated
  total_faturamento?: number;
  total_sessoes?: number;
  total_investimento?: number;
  total_pedidos?: number;
}

export type PeriodFilter = "7" | "30" | "90" | "all" | "custom";

export interface DashAdminFilters {
  period: PeriodFilter;
  customStart?: string;
  customEnd?: string;
  status: string;
  search: string;
}

const ITEMS_PER_PAGE = 20;

export function useDashAdmin() {
  const [filters, setFilters] = useState<DashAdminFilters>({
    period: "all",
    status: "all",
    search: "",
  });
  const [page, setPage] = useState(0);

  // Fetch all mentorado profiles
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

  // Fetch aggregated daily_results for all mentorados
  const revenueQuery = useQuery({
    queryKey: ["dash-admin-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("user_id, receita_paga, sessoes, investimento, pedidos_pagos");
      if (error) throw error;
      // aggregate per user
      const agg: Record<string, { faturamento: number; sessoes: number; investimento: number; pedidos: number }> = {};
      for (const row of data || []) {
        if (!agg[row.user_id]) agg[row.user_id] = { faturamento: 0, sessoes: 0, investimento: 0, pedidos: 0 };
        agg[row.user_id].faturamento += Number(row.receita_paga || 0);
        agg[row.user_id].sessoes += Number(row.sessoes || 0);
        agg[row.user_id].investimento += Number(row.investimento || 0);
        agg[row.user_id].pedidos += Number(row.pedidos_pagos || 0);
      }
      return agg;
    },
  });

  // Merge profiles with revenue data
  const mentorados = useMemo(() => {
    if (!profilesQuery.data) return [];
    const rev = revenueQuery.data || {};
    return profilesQuery.data.map((p) => ({
      ...p,
      total_faturamento: rev[p.user_id]?.faturamento || 0,
      total_sessoes: rev[p.user_id]?.sessoes || 0,
      total_investimento: rev[p.user_id]?.investimento || 0,
      total_pedidos: rev[p.user_id]?.pedidos || 0,
    }));
  }, [profilesQuery.data, revenueQuery.data]);

  // Available columns (dynamic from data keys)
  const allColumns = useMemo(() => {
    if (mentorados.length === 0) return [];
    const keys = Object.keys(mentorados[0]);
    // exclude internal
    const exclude = ["id", "must_change_password"];
    return keys.filter((k) => !exclude.includes(k));
  }, [mentorados]);

  // Filter
  const filtered = useMemo(() => {
    let result = [...mentorados];
    const now = new Date();

    // Period filter (based on created_at)
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

    // Status
    if (filters.status !== "all") {
      result = result.filter((m) => m.access_status === filters.status);
    }

    // Search
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
  }, [mentorados, filters]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const in30 = addDays(now, 30);
    const last30 = subDays(now, 30);

    const total = mentorados.length;
    const active = mentorados.filter((m) => m.access_status === "active").length;
    const newRecent = mentorados.filter((m) => isAfter(parseISO(m.created_at), last30)).length;
    const expiringSoon = mentorados.filter(
      (m) => m.access_expires_at && isBefore(parseISO(m.access_expires_at), in30) && isAfter(parseISO(m.access_expires_at), now)
    ).length;
    const totalRev = mentorados.reduce((s, m) => s + (m.total_faturamento || 0), 0);
    const avgRev = total > 0 ? totalRev / total : 0;

    return { total, active, newRecent, expiringSoon, totalRev, avgRev, hasRevenue: totalRev > 0 };
  }, [mentorados]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Chart data
  const chartData = useMemo(() => {
    // Entries over time (by month)
    const entriesByMonth: Record<string, number> = {};
    const expirationsByMonth: Record<string, number> = {};

    for (const m of mentorados) {
      const month = format(parseISO(m.created_at), "yyyy-MM");
      entriesByMonth[month] = (entriesByMonth[month] || 0) + 1;

      if (m.access_expires_at) {
        const expMonth = format(parseISO(m.access_expires_at), "yyyy-MM");
        expirationsByMonth[expMonth] = (expirationsByMonth[expMonth] || 0) + 1;
      }
    }

    const statusDistribution: Record<string, number> = {};
    for (const m of mentorados) {
      statusDistribution[m.access_status] = (statusDistribution[m.access_status] || 0) + 1;
    }

    return {
      entries: Object.entries(entriesByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      expirations: Object.entries(expirationsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ status, count })),
    };
  }, [mentorados]);

  // CSV export
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
    paginated,
    page,
    setPage,
    totalPages,
    filters,
    setFilters,
    kpis,
    chartData,
    allColumns,
    exportCSV,
    isLoading: profilesQuery.isLoading || revenueQuery.isLoading,
  };
}
