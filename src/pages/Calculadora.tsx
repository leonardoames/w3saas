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

export type Channel = "site" | "shopee";

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

export function useCalculatorResults(inputs: ProductInputs, channel: Channel) {
  return useMemo(() => {
    const sellingPrice = parseFloat(inputs.sellingPrice || "0");
    const productCost = parseFloat(inputs.productCost || "0");
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

    const pctCostSum = Object.values(values).reduce((a, b) => a + b, 0);

    const shopeeTarifa = channel === "shopee" ? getShopeeTarifa(sellingPrice) : 0;
    const shopeeComissaoPct = channel === "shopee" ? getShopeeComissaoPct(sellingPrice) : 0;
    const shopeeComissaoRS = (sellingPrice * shopeeComissaoPct) / 100;

    const custoVendaTotal = pctCostSum + shopeeTarifa + shopeeComissaoRS;
    const custoTotal = productCost + custoVendaTotal;
    const lucroLiquido = sellingPrice - custoTotal;
    const margemPct = sellingPrice > 0 ? (lucroLiquido / sellingPrice) * 100 : 0;

    return {
      sellingPrice, productCost, pcts, values,
      pctCostSum, shopeeTarifa, shopeeComissaoPct, shopeeComissaoRS,
      custoVendaTotal, custoTotal, lucroLiquido, margemPct,
      isValid: sellingPrice > 0,
    };
  }, [inputs, channel]);
}

const costRows: { key: keyof ReturnType<typeof useCalculatorResults>["pcts"]; label: string; inputKey: keyof ProductInputs; tooltip: string }[] = [
  { key: "mediaCost", label: "Custo de Mídia", inputKey: "mediaCost", tooltip: "Percentual do faturamento investido em anúncios (Meta Ads, Google Ads, etc.)" },
  { key: "fixedCosts", label: "Custos Fixos", inputKey: "fixedCosts", tooltip: "Aluguel, salários, internet, ferramentas — divididos pelo faturamento mensal" },
  { key: "taxes", label: "Impostos", inputKey: "taxes", tooltip: "Alíquota de impostos sobre a venda (Simples Nacional, Lucro Presumido, etc.)" },
  { key: "gatewayFee", label: "Taxa Gateway", inputKey: "gatewayFee", tooltip: "Taxa cobrada pelo meio de pagamento (Mercado Pago, PagSeguro, Stripe, etc.)" },
  { key: "platformFee", label: "Taxa Plataforma", inputKey: "platformFee", tooltip: "Percentual cobrado pela plataforma de e-commerce (Shopify, Nuvemshop, etc.)" },
  { key: "extraFees", label: "Taxas Extras", inputKey: "extraFees", tooltip: "Outras taxas como antifraude, frete grátis subsidiado, etc." },
];

const disabledChannels = [
  { value: "temu", label: "TEMU" },
  { value: "tiktokshop", label: "TikTok Shop" },
  { value: "shein", label: "SHEIN" },
  { value: "meli", label: "Mercado Livre" },
];

export default function Calculadora() {
  const [inputs, setInputs] = useState<ProductInputs>(defaultInputs);
  const [savedInputs, setSavedInputs] = useState<ProductInputs>(defaultInputs);
  const [channel, setChannel] = useState<Channel>("site");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [productsListOpen, setProductsListOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const results = useCalculatorResults(inputs, channel);

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
    if (disabledChannels.some((c) => c.value === val)) {
      toast.info("Disponível em breve");
      return;
    }
    setChannel(val as Channel);
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

  // Find the max cost key for highlighting
  const maxCostKey = useMemo(() => {
    let maxKey = "";
    let maxVal = -1;
    Object.entries(results.values).forEach(([k, v]) => {
      if (v > maxVal) { maxVal = v; maxKey = k; }
    });
    if (channel === "shopee") {
      if (results.shopeeComissaoRS > maxVal) { maxKey = "shopeeComissao"; maxVal = results.shopeeComissaoRS; }
      if (results.shopeeTarifa > maxVal) { maxKey = "shopeeTarifa"; }
    }
    return maxVal > 0 ? maxKey : "";
  }, [results, channel]);

  const isNegative = results.margemPct < 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Precificadora</h1>
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
              <div className="flex gap-1">
                {[
                  { value: "site", label: "🌐 SITE" },
                  { value: "shopee", label: "🟠 SHOPEE" },
                ].map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => handleChannelChange(ch.value)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      channel === ch.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
                {disabledChannels.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => toast.info("Disponível em breve")}
                    className="px-3 py-1.5 rounded-md text-xs text-muted-foreground/50 bg-muted/50 cursor-not-allowed"
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              {channel === "shopee" && (
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
                  return (
                    <div
                      key={row.key}
                      className={`grid grid-cols-[1fr_70px_80px] gap-2 items-center py-0.5 rounded-sm transition-colors ${
                        isMax ? "bg-accent/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Label className="text-xs truncate">{row.label}</Label>
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
