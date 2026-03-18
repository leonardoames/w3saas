import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Save, FolderOpen, FileDown, Copy, Lock, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveProductDialog } from "@/components/precificadora/SaveProductDialog";
import { SavedProductsList } from "@/components/precificadora/SavedProductsList";
import { generatePricingPDF } from "@/lib/pricingPdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import shopeeLogo from "@/assets/platforms/shopee.png";
import nuvemshopLogo from "@/assets/platforms/nuvemshop.png";
import mercadoLivreLogo from "@/assets/platforms/mercado-livre.png";
import temuLogo from "@/assets/platforms/temu.svg";
import tiktokLogo from "@/assets/platforms/tiktok.svg";
import sheinLogo from "@/assets/platforms/shein.svg";

export type Channel = "site" | "shopee" | "temu" | "tiktokshop" | "shein" | "meli-classico" | "meli-premium";

export interface ProductInputs {
  title: string;
  sellingPrice: string;
  productCost: string;
  mediaCost: string;
  fixedCosts: string;
  taxes: string;
  gatewayFee: string;
  platformFee: string;
  extraFees: string;
  logisticaReversa: string;
}

const defaultInputs: ProductInputs = {
  title: "",
  sellingPrice: "",
  productCost: "",
  mediaCost: "",
  fixedCosts: "",
  taxes: "",
  gatewayFee: "",
  platformFee: "",
  extraFees: "",
  logisticaReversa: "",
};

/* ── Shopee-specific cost helpers ── */
function getShopeeTarifa(preco: number): number {
  if (preco < 80) return 4;
  if (preco < 100) return 16;
  if (preco < 200) return 20;
  return 26;
}

function getShopeeComissaoPct(preco: number): number {
  return preco <= 79.99 ? 20 : 14;
}

/* ── Channel config for fixed commissions/tariffs ── */
interface ChannelFixedCosts {
  tarifaFixa: number;
  comissaoPct: number;
  comissaoLabel: string;
  tarifaLabel: string;
}

const channelFixedCosts: Partial<Record<Channel, ChannelFixedCosts>> = {
  tiktokshop: { tarifaFixa: 2, comissaoPct: 12, comissaoLabel: "Comissão TikTok (12%)", tarifaLabel: "Tarifa Fixa (R$2,00)" },
  shein: { tarifaFixa: 4, comissaoPct: 18, comissaoLabel: "Comissão Shein (18%)", tarifaLabel: "Tarifa Fixa (R$4,00)" },
  "meli-classico": { tarifaFixa: 6, comissaoPct: 14, comissaoLabel: "Comissão ML Clássico (14%)", tarifaLabel: "Tarifa Fixa (R$6,00)" },
  "meli-premium": { tarifaFixa: 6, comissaoPct: 19, comissaoLabel: "Comissão ML Premium (19%)", tarifaLabel: "Tarifa Fixa (R$6,00)" },
};

// Keys visible per channel — hidden fields are excluded from calculation
const visibleKeysPerChannel: Record<Channel, (keyof ProductInputs)[]> = {
  site: ["mediaCost", "fixedCosts", "taxes", "gatewayFee", "platformFee", "extraFees"],
  shopee: ["mediaCost", "fixedCosts", "taxes", "extraFees"],
  temu: ["mediaCost", "fixedCosts", "taxes", "extraFees"],
  tiktokshop: ["mediaCost", "fixedCosts", "taxes", "extraFees"],
  shein: ["fixedCosts", "taxes", "extraFees"],
  "meli-classico": ["mediaCost", "fixedCosts", "taxes", "extraFees"],
  "meli-premium": ["mediaCost", "fixedCosts", "taxes", "extraFees"],
};

/* ── Media cost label per channel ── */
const mediaCostLabel: Record<Channel, string> = {
  site: "Custo de Mídia",
  shopee: "Shopee Ads",
  temu: "TEMU Ads",
  tiktokshop: "TikTok Ads / Comissão Afiliados",
  shein: "Custo de Mídia", // hidden for shein but fallback
  "meli-classico": "Mercado Ads",
  "meli-premium": "Mercado Ads",
};

export function useCalculatorResults(inputs: ProductInputs, channel: Channel) {
  return useMemo(() => {
    const sellingPrice = parseFloat(inputs.sellingPrice || "0");
    const productCost = parseFloat(inputs.productCost || "0");
    const visibleKeys = visibleKeysPerChannel[channel];
    const pcts = {
      mediaCost: parseFloat(inputs.mediaCost || "0"),
      fixedCosts: parseFloat(inputs.fixedCosts || "0"),
      taxes: parseFloat(inputs.taxes || "0"),
      gatewayFee: parseFloat(inputs.gatewayFee || "0"),
      platformFee: parseFloat(inputs.platformFee || "0"),
      extraFees: parseFloat(inputs.extraFees || "0"),
    };
    const values = {
      mediaCost: (sellingPrice * pcts.mediaCost) / 100,
      fixedCosts: (sellingPrice * pcts.fixedCosts) / 100,
      taxes: (sellingPrice * pcts.taxes) / 100,
      gatewayFee: (sellingPrice * pcts.gatewayFee) / 100,
      platformFee: (sellingPrice * pcts.platformFee) / 100,
      extraFees: (sellingPrice * pcts.extraFees) / 100,
    };

    // Only sum visible fields for active channel
    const pctCostSum = Object.entries(values)
      .filter(([k]) => visibleKeys.includes(k as keyof ProductInputs))
      .reduce((a, [, v]) => a + v, 0);

    // Shopee
    const shopeeTarifa = channel === "shopee" ? getShopeeTarifa(sellingPrice) : 0;
    const shopeeComissaoPct = channel === "shopee" ? getShopeeComissaoPct(sellingPrice) : 0;
    const shopeeComissaoRS = (sellingPrice * shopeeComissaoPct) / 100;

    // TEMU — logística reversa sobre custo
    const logisticaReversaPct = channel === "temu" ? parseFloat(inputs.logisticaReversa || "0") : 0;
    const logisticaReversaRS = (productCost * logisticaReversaPct) / 100;

    // Fixed commission channels (tiktokshop, shein, meli-classico, meli-premium)
    const fixedConfig = channelFixedCosts[channel];
    const channelTarifaFixa = fixedConfig?.tarifaFixa ?? 0;
    const channelComissaoPct = fixedConfig?.comissaoPct ?? 0;
    const channelComissaoRS = (sellingPrice * channelComissaoPct) / 100;

    // Total cost calculation
    let custoVendaTotal = pctCostSum;
    if (channel === "shopee") {
      custoVendaTotal += shopeeTarifa + shopeeComissaoRS;
    } else if (channel === "temu") {
      custoVendaTotal += logisticaReversaRS;
    } else if (fixedConfig) {
      custoVendaTotal += channelTarifaFixa + channelComissaoRS;
    }

    const custoTotal = productCost + custoVendaTotal;
    const lucroLiquido = sellingPrice - custoTotal;
    const margemPct = sellingPrice > 0 ? (lucroLiquido / sellingPrice) * 100 : 0;

    return {
      sellingPrice, productCost, pcts, values,
      pctCostSum, shopeeTarifa, shopeeComissaoPct, shopeeComissaoRS,
      logisticaReversaPct, logisticaReversaRS,
      channelTarifaFixa, channelComissaoPct, channelComissaoRS,
      custoVendaTotal, custoTotal, lucroLiquido, margemPct,
      isValid: sellingPrice > 0,
    };
  }, [inputs, channel]);
}

const allCostRows: { key: keyof ReturnType<typeof useCalculatorResults>["pcts"]; label: string; inputKey: keyof ProductInputs; tooltip: string; channels: Channel[] }[] = [
  { key: "mediaCost", label: "Custo de Mídia", inputKey: "mediaCost", tooltip: "Percentual do faturamento investido em anúncios (Meta Ads, Google Ads, etc.)", channels: ["site", "shopee", "temu", "tiktokshop", "meli-classico", "meli-premium"] },
  { key: "fixedCosts", label: "Custos Fixos", inputKey: "fixedCosts", tooltip: "Aluguel, salários, internet, ferramentas — divididos pelo faturamento mensal", channels: ["site", "shopee", "temu", "tiktokshop", "shein", "meli-classico", "meli-premium"] },
  { key: "taxes", label: "Impostos", inputKey: "taxes", tooltip: "Alíquota de impostos sobre a venda (Simples Nacional, Lucro Presumido, etc.)", channels: ["site", "shopee", "temu", "tiktokshop", "shein", "meli-classico", "meli-premium"] },
  { key: "gatewayFee", label: "Taxa Gateway", inputKey: "gatewayFee", tooltip: "Taxa cobrada pelo meio de pagamento (Mercado Pago, PagSeguro, Stripe, etc.)", channels: ["site"] },
  { key: "platformFee", label: "Taxa Plataforma", inputKey: "platformFee", tooltip: "Percentual cobrado pela plataforma de e-commerce (Shopify, Nuvemshop, etc.)", channels: ["site"] },
  { key: "extraFees", label: "Taxas Extras", inputKey: "extraFees", tooltip: "Outras taxas como antifraude, frete grátis subsidiado, etc.", channels: ["site", "shopee", "temu", "tiktokshop", "shein", "meli-classico", "meli-premium"] },
];

const channelTabs: { value: Channel; label: string; icon: string }[] = [
  { value: "site", label: "Site", icon: nuvemshopLogo },
  { value: "shopee", label: "Shopee", icon: shopeeLogo },
  { value: "temu", label: "Temu", icon: temuLogo },
  { value: "tiktokshop", label: "TikTok", icon: tiktokLogo },
  { value: "shein", label: "Shein", icon: sheinLogo },
  { value: "meli-classico", label: "ML Clássico", icon: mercadoLivreLogo },
  { value: "meli-premium", label: "ML Premium", icon: mercadoLivreLogo },
];

const channelHasAutoRules = (ch: Channel) => ch !== "site";

const STORAGE_KEY = "w3_calc_draft";

function loadDraft(): { inputs: ProductInputs; channel: Channel } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { inputs: defaultInputs, channel: "site" };
}

export default function Calculadora() {
  const draft = loadDraft();
  const [inputs, setInputs] = useState<ProductInputs>(draft.inputs);
  const [savedInputs, setSavedInputs] = useState<ProductInputs>(defaultInputs);
  const [channel, setChannel] = useState<Channel>(draft.channel);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [productsListOpen, setProductsListOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const results = useCalculatorResults(inputs, channel);

  // Persist draft on every change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, channel }));
  }, [inputs, channel]);

  const hasUnsavedChanges = JSON.stringify(inputs) !== JSON.stringify(savedInputs);

  // Browser beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const updateInput = (key: keyof ProductInputs, value: string) => {
    if (key !== "title" && key !== "sellingPrice" && key !== "productCost") {
      const num = parseFloat(value);
      if (!isNaN(num) && num < 0) value = "0";
    }
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleChannelChange = (val: string) => {
    if (val !== channel) {
      setChannel(val as Channel);
      toast.info("Alguns custos foram ocultados para este canal.", { duration: 3000 });
    }
  };

  const handleLoadProduct = (product: any) => {
    const loaded: ProductInputs = {
      title: product.name || "",
      sellingPrice: product.selling_price?.toString() || "",
      productCost: product.product_cost?.toString() || "",
      mediaCost: product.media_cost_pct?.toString() || "",
      fixedCosts: product.fixed_costs_pct?.toString() || "",
      taxes: product.taxes_pct?.toString() || "",
      gatewayFee: product.gateway_fee_pct?.toString() || "",
      platformFee: product.platform_fee_pct?.toString() || "",
      extraFees: product.extra_fees_pct?.toString() || "",
      logisticaReversa: "",
    };
    setInputs(loaded);
    setSavedInputs(loaded);
    setEditingProductId(product.id);
    setProductsListOpen(false);
    toast.success(`Produto "${product.name}" carregado`);
  };

  const handleExportPDF = () => {
    if (!results.isValid) return;
    generatePricingPDF(inputs, results, channel);
    toast.success("PDF exportado!");
  };

  const handleDuplicate = () => {
    setInputs((prev) => ({ ...prev, title: `Cópia de ${prev.title || "Produto"}` }));
    setEditingProductId(null);
    toast.success("Produto duplicado — salve para criar uma nova entrada");
  };

  const handleSaveAndProceed = async () => {
    setSaveDialogOpen(true);
    setUnsavedDialogOpen(false);
  };

  const handleDiscardAndLeave = () => {
    setUnsavedDialogOpen(false);
  };

  const handleCancelLeave = () => {
    setUnsavedDialogOpen(false);
  };

  const handleEnterKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) next.focus();
    }
  };

  // Filter cost rows by active channel
  const costRows = useMemo(() => allCostRows.filter((r) => r.channels.includes(channel)), [channel]);

  // Find the max cost key for highlighting (only visible fields)
  const visibleKeys = visibleKeysPerChannel[channel];
  const maxCostKey = useMemo(() => {
    let maxKey = "";
    let maxVal = -1;
    Object.entries(results.values)
      .filter(([k]) => visibleKeys.includes(k as keyof ProductInputs))
      .forEach(([k, v]) => {
        if (v > maxVal) { maxVal = v; maxKey = k; }
      });
    if (channel === "shopee") {
      if (results.shopeeComissaoRS > maxVal) { maxKey = "shopeeComissao"; maxVal = results.shopeeComissaoRS; }
      if (results.shopeeTarifa > maxVal) { maxKey = "shopeeTarifa"; }
    }
    if (channel === "temu") {
      if (results.logisticaReversaRS > maxVal) { maxKey = "logisticaReversa"; }
    }
    const fixedConfig = channelFixedCosts[channel];
    if (fixedConfig) {
      if (results.channelComissaoRS > maxVal) { maxKey = "channelComissao"; maxVal = results.channelComissaoRS; }
      if (results.channelTarifaFixa > maxVal) { maxKey = "channelTarifa"; }
    }
    return maxVal > 0 ? maxKey : "";
  }, [results, channel, visibleKeys]);

  const isNegative = results.margemPct < 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Precificadora</h1>
            <p className="text-muted-foreground text-sm">
              Descubra se o seu preço cobre todos os custos e gera lucro.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setProductsListOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Meus Produtos</span>
              <span className="sm:hidden">Produtos</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!results.isValid}>
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={!results.isValid}>
              <Copy className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Duplicar</span>
            </Button>
            <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!results.isValid}>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>

        {/* 1) CANAL - Tabs */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold shrink-0">Canal</Label>
              <div className="flex gap-1 flex-wrap">
                {channelTabs.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => handleChannelChange(ch.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                      channel === ch.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <img src={ch.icon} alt={ch.label} className="h-3.5 w-3.5 rounded-[3px] object-contain" />
                    <span>{ch.label}</span>
                  </button>
                ))}
              </div>
              {channelHasAutoRules(channel) && (
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Regras automáticas aplicadas
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
          {/* 2) PRODUTO */}
          <Card className="self-start">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título do Produto</Label>
                <Input
                  ref={(el) => (inputRefs.current[0] = el)}
                  placeholder="Ex: Camiseta Oversized PP"
                  value={inputs.title}
                  onChange={(e) => updateInput("title", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preço de Venda</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                  <Input
                    ref={(el) => (inputRefs.current[1] = el)}
                    type="number" min="0" placeholder="0.00"
                    value={inputs.sellingPrice}
                    onChange={(e) => updateInput("sellingPrice", e.target.value)}
                    onKeyDown={(e) => handleEnterKey(e, 1)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Custo do Produto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                  <Input
                    ref={(el) => (inputRefs.current[2] = el)}
                    type="number" min="0" placeholder="0.00"
                    value={inputs.productCost}
                    onChange={(e) => updateInput("productCost", e.target.value)}
                    onKeyDown={(e) => handleEnterKey(e, 2)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3) CUSTOS PERCENTUAIS - Excel style */}
          <Card className="self-start">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Custos Percentuais</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_70px_80px] gap-2 text-[11px] font-medium text-muted-foreground px-0.5 pb-1 border-b border-border">
                  <span>Item</span>
                  <span className="text-center">%</span>
                  <span className="text-right">R$</span>
                </div>
                {costRows.map((row, idx) => {
                  const isMax = maxCostKey === row.key;
                  const displayLabel = row.key === "mediaCost" ? mediaCostLabel[channel] : row.label;
                  return (
                    <div
                      key={row.key}
                      className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm transition-colors ${
                        isMax ? "bg-accent/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Label className="text-xs truncate">{displayLabel}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground/50 shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            {row.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Input
                          ref={(el) => (inputRefs.current[3 + idx] = el)}
                          type="number" min="0" step="0.1" placeholder="0"
                          value={inputs[row.inputKey]}
                          onChange={(e) => updateInput(row.inputKey, e.target.value)}
                          onKeyDown={(e) => handleEnterKey(e, 3 + idx)}
                          className="pr-6 text-center h-8 text-xs"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                      </div>
                      <motion.span
                        key={results.values[row.key].toFixed(2)}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        className={`text-xs text-right tabular-nums ${isMax ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                      >
                        R$ {results.values[row.key].toFixed(2)}
                      </motion.span>
                    </div>
                  );
                })}

                {/* TEMU exclusive: Logística Reversa */}
                {channel === "temu" && (
                  <>
                    <div className="border-t border-border my-1" />
                    <div className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm ${maxCostKey === "logisticaReversa" ? "bg-accent/50" : ""}`}>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs truncate text-orange-400">Logística Reversa</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-orange-400/50 shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            Percentual cobrado sobre o custo do produto em caso de devolução
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Input
                          type="number" min="0" step="0.1" placeholder="0"
                          value={inputs.logisticaReversa}
                          onChange={(e) => updateInput("logisticaReversa", e.target.value)}
                          className="pr-6 text-center h-8 text-xs"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                      </div>
                      <span className={`text-xs text-right tabular-nums text-orange-400 ${maxCostKey === "logisticaReversa" ? "font-semibold" : "font-medium"}`}>
                        R$ {results.logisticaReversaRS.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 pl-0.5">* Calculado sobre o custo do produto</span>
                  </>
                )}

                {/* Shopee-specific rows */}
                {channel === "shopee" && (
                  <>
                    <div className="border-t border-border my-1" />
                    <div className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm ${maxCostKey === "shopeeTarifa" ? "bg-accent/50" : ""}`}>
                      <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Tarifa Fixa Shopee
                      </Label>
                      <span className="text-xs text-center text-muted-foreground">—</span>
                      <span className={`text-xs text-right tabular-nums text-orange-400 ${maxCostKey === "shopeeTarifa" ? "font-semibold" : "font-medium"}`}>
                        R$ {results.shopeeTarifa.toFixed(2)}
                      </span>
                    </div>
                    <div className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm ${maxCostKey === "shopeeComissao" ? "bg-accent/50" : ""}`}>
                      <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Comissão Shopee
                      </Label>
                      <span className="text-xs text-center tabular-nums text-orange-400">
                        {results.shopeeComissaoPct}%
                      </span>
                      <span className={`text-xs text-right tabular-nums text-orange-400 ${maxCostKey === "shopeeComissao" ? "font-semibold" : "font-medium"}`}>
                        R$ {results.shopeeComissaoRS.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {/* Fixed commission channel rows (tiktokshop, shein, meli-classico, meli-premium) */}
                {channelFixedCosts[channel] && (
                  <>
                    <div className="border-t border-border my-1" />
                    <div className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm ${maxCostKey === "channelTarifa" ? "bg-accent/50" : ""}`}>
                      <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {channelFixedCosts[channel]!.tarifaLabel}
                      </Label>
                      <span className="text-xs text-center text-muted-foreground">—</span>
                      <span className={`text-xs text-right tabular-nums text-orange-400 ${maxCostKey === "channelTarifa" ? "font-semibold" : "font-medium"}`}>
                        R$ {results.channelTarifaFixa.toFixed(2)}
                      </span>
                    </div>
                    <div className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm ${maxCostKey === "channelComissao" ? "bg-accent/50" : ""}`}>
                      <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {channelFixedCosts[channel]!.comissaoLabel}
                      </Label>
                      <span className="text-xs text-center tabular-nums text-orange-400">
                        {results.channelComissaoPct}%
                      </span>
                      <span className={`text-xs text-right tabular-nums text-orange-400 ${maxCostKey === "channelComissao" ? "font-semibold" : "font-medium"}`}>
                        R$ {results.channelComissaoRS.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {/* Subtotal */}
                <div className="grid grid-cols-[1fr_70px_80px] gap-2 items-center pt-2 mt-1 border-t border-border">
                  <Label className="text-xs font-semibold">Subtotal Custos</Label>
                  <span className="text-xs text-center text-muted-foreground">—</span>
                  <motion.span
                    key={results.custoVendaTotal.toFixed(2)}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-right tabular-nums font-semibold text-foreground"
                  >
                    R$ {results.custoVendaTotal.toFixed(2)}
                  </motion.span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4) RESULTADOS */}
          <Card className="self-start lg:sticky lg:top-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultados</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {results.isValid ? (
                <div className="space-y-3">
                  <ResultRow label="Custo Total" value={`R$ ${results.custoTotal.toFixed(2)}`} />
                  <div className="border-t border-border pt-3 space-y-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={results.lucroLiquido.toFixed(2)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-lg p-3 text-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}
                      >
                        <p className="text-[11px] text-muted-foreground mb-0.5">Lucro Líquido</p>
                        <p className={`text-2xl font-bold tabular-nums ${isNegative ? "text-destructive" : "text-success"}`}>
                          R$ {results.lucroLiquido.toFixed(2)}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={results.margemPct.toFixed(1)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className={`rounded-lg p-3 text-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}
                      >
                        <p className="text-[11px] text-muted-foreground mb-0.5">Margem</p>
                        <p className={`text-2xl font-bold tabular-nums ${isNegative ? "text-destructive" : "text-success"}`}>
                          {results.margemPct.toFixed(1)}%
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center text-muted-foreground text-center text-sm">
                  <p>Preencha o preço de venda para ver os resultados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <SaveProductDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          inputs={inputs}
          editingProductId={editingProductId}
          onSaved={() => {
            setEditingProductId(null);
            setSavedInputs({ ...inputs });
          }}
        />

        <SavedProductsList
          open={productsListOpen}
          onOpenChange={setProductsListOpen}
          onLoadProduct={handleLoadProduct}
        />

        {/* Unsaved changes dialog */}
        <Dialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alterações não salvas</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Você tem alterações não salvas. Deseja salvar antes de sair?
            </p>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCancelLeave}>Cancelar</Button>
              <Button variant="ghost" onClick={handleDiscardAndLeave}>Sair sem salvar</Button>
              <Button onClick={handleSaveAndProceed}>
                <Save className="h-4 w-4 mr-1" />
                Salvar Produto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/* ── Result Row ── */
function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
