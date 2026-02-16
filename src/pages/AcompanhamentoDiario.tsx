import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, parseISO, isWithinInterval, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { DailyResultsTable, DailyResult } from "@/components/acompanhamento/DailyResultsTable";
import { DailyResultModal, DailyResultFormData } from "@/components/acompanhamento/DailyResultModal";
import { ImportPreviewDialog, ImportRow } from "@/components/acompanhamento/ImportPreviewDialog";

const emptyForm: DailyResultFormData = {
  data: format(new Date(), "yyyy-MM-dd"),
  investimento: "",
  sessoes: "",
  pedidos_pagos: "",
  receita_paga: "",
};

// CSV parser for pt-BR format
function parseCSV(text: string): ImportRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));

  const idxData = headers.findIndex((h) => h.includes("data") || h === "date" || h === "dia");
  const idxInv = headers.findIndex((h) => h.includes("investido") || h.includes("investimento") || h.includes("custo"));
  const idxSess = headers.findIndex((h) => h.includes("sess") || h.includes("visitantes"));
  const idxPed = headers.findIndex((h) => h.includes("pedido") || h.includes("orders") || h.includes("conversões"));
  const idxRec = headers.findIndex((h) => h.includes("receita") || h.includes("faturamento") || h.includes("revenue"));

  if (idxData === -1) return [];

  const parseNum = (val: string) => {
    if (!val) return 0;
    let c = val.replace(/[^\d.,-]/g, "");
    if (c.includes(",") && !c.includes(".")) c = c.replace(",", ".");
    else if (c.includes(".") && c.includes(",")) {
      if (c.lastIndexOf(",") > c.lastIndexOf(".")) c = c.replace(/\./g, "").replace(",", ".");
      else c = c.replace(/,/g, "");
    }
    return parseFloat(c) || 0;
  };

  const parseInt2 = (val: string) => {
    if (!val) return 0;
    return parseInt(val.replace(/\D/g, "")) || 0;
  };

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
      let dateStr = cols[idxData];
      if (!dateStr || dateStr.toLowerCase().includes("total")) return null;

      // dd/mm/yyyy -> yyyy-mm-dd
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split("/");
        dateStr = `${y}-${m}-${d}`;
      }

      return {
        data: dateStr,
        investimento: idxInv >= 0 ? parseNum(cols[idxInv]) : 0,
        sessoes: idxSess >= 0 ? parseInt2(cols[idxSess]) : 0,
        pedidos_pagos: idxPed >= 0 ? parseInt2(cols[idxPed]) : 0,
        receita_paga: idxRec >= 0 ? parseNum(cols[idxRec]) : 0,
      };
    })
    .filter(Boolean) as ImportRow[];
}

export default function AcompanhamentoDiario() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<DailyResult[]>([]);
  const [searchDate, setSearchDate] = useState("");

  // Period
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<DailyResultFormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Import
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("daily_results" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("data", { ascending: false });
    if (!error && data) setAllData(data as any);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handlePeriodChange = (period: string, start: Date, end: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: start, to: end });
  };

  const filteredData = useMemo(() => {
    let result = allData.filter((d) => {
      const date = parseISO(d.data);
      if (!isValid(date)) return false;
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
    if (searchDate) {
      result = result.filter((d) => d.data.includes(searchDate) || format(parseISO(d.data), "dd/MM/yyyy").includes(searchDate));
    }
    return result;
  }, [allData, dateRange, searchDate]);

  // Add/Edit
  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleEdit = (row: DailyResult) => {
    setFormData({
      data: row.data,
      investimento: String(row.investimento || ""),
      sessoes: String(row.sessoes || ""),
      pedidos_pagos: String(row.pedidos_pagos || ""),
      receita_paga: String(row.receita_paga || ""),
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !formData.data) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        data: formData.data,
        investimento: parseFloat(formData.investimento) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        pedidos_pagos: parseInt(formData.pedidos_pagos) || 0,
        receita_paga: parseFloat(formData.receita_paga) || 0,
      };
      const { error } = await (supabase.from("daily_results" as any) as any).upsert(payload, {
        onConflict: "user_id,data",
      });
      if (error) throw error;
      toast({ title: "Sucesso!", description: isEditing ? "Registro atualizado." : "Registro adicionado." });
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase.from("daily_results" as any) as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Registro removido." });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // CSV Import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast({ title: "Atenção", description: "Nenhuma linha válida encontrada no CSV.", variant: "destructive" });
        return;
      }
      setImportRows(rows);
      setImportResult(null);
      setImportOpen(true);
    } catch {
      toast({ title: "Erro", description: "Não foi possível ler o arquivo.", variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleImportConfirm = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const payload = importRows.map((r) => ({
        user_id: user.id,
        data: r.data,
        investimento: r.investimento,
        sessoes: r.sessoes,
        pedidos_pagos: r.pedidos_pagos,
        receita_paga: r.receita_paga,
      }));
      const { error } = await (supabase.from("daily_results" as any) as any).upsert(payload, {
        onConflict: "user_id,data",
      });
      if (error) throw error;
      setImportResult({ created: payload.length, updated: 0 });
      toast({ title: "Importação concluída!", description: `${payload.length} registros processados.` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Acompanhamento Diário</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus resultados diários</p>
        </div>

        {/* Filters + Actions */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <PeriodFilter
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por data..."
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-8 h-8 w-40 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" accept=".csv" className="hidden" id="csv-import" onChange={handleFileSelect} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-import")?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Planilha
              </Button>
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Manualmente
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <DailyResultsTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
        </div>

        {/* Modals */}
        <DailyResultModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          saving={saving}
          isEditing={isEditing}
        />
        <ImportPreviewDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          rows={importRows}
          onConfirm={handleImportConfirm}
          importing={importing}
          result={importResult}
        />
      </div>
    </div>
  );
}
