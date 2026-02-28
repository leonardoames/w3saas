import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Save, FolderOpen, FileDown, AlertTriangle, CheckCircle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveProductDialog } from "@/components/precificadora/SaveProductDialog";
import { SavedProductsList } from "@/components/precificadora/SavedProductsList";
import { generatePricingPDF } from "@/lib/pricingPdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

    // Shopee extras
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

const costRows: { key: keyof ReturnType<typeof useCalculatorResults>["pcts"]; label: string; inputKey: keyof ProductInputs }[] = [
  { key: "mediaCost", label: "Custo de Mídia", inputKey: "mediaCost" },
  { key: "fixedCosts", label: "Custos Fixos", inputKey: "fixedCosts" },
  { key: "taxes", label: "Impostos", inputKey: "taxes" },
  { key: "gatewayFee", label: "Taxa do Gateway", inputKey: "gatewayFee" },
  { key: "platformFee", label: "Taxa da Plataforma", inputKey: "platformFee" },
  { key: "extraFees", label: "Taxas Extras", inputKey: "extraFees" },
];

const disabledChannels = [
  { value: "temu", label: "TEMU" },
  { value: "tiktokshop", label: "TikTok Shop" },
  { value: "shein", label: "SHEIN" },
  { value: "meli", label: "Mercado Livre" },
];

export default function Calculadora() {
  const [inputs, setInputs] = useState<ProductInputs>(defaultInputs);
  const [channel, setChannel] = useState<Channel>("site");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [productsListOpen, setProductsListOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const results = useCalculatorResults(inputs, channel);

  const updateInput = (key: keyof ProductInputs, value: string) => {
    // Block negative for percentage fields
    if (key !== "title" && key !== "sellingPrice" && key !== "productCost") {
      const num = parseFloat(value);
      if (!isNaN(num) && num < 0) {
        value = "0";
      }
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
    setInputs({
      title: product.name || "",
      sellingPrice: product.selling_price?.toString() || "",
      productCost: product.product_cost?.toString() || "",
      mediaCost: product.media_cost_pct?.toString() || "",
      fixedCosts: product.fixed_costs_pct?.toString() || "",
      taxes: product.taxes_pct?.toString() || "",
      gatewayFee: product.gateway_fee_pct?.toString() || "",
      platformFee: product.platform_fee_pct?.toString() || "",
      extraFees: product.extra_fees_pct?.toString() || "",
    });
    setEditingProductId(product.id);
    setProductsListOpen(false);
    toast.success(`Produto "${product.name}" carregado`);
  };

  const handleExportPDF = () => {
    if (!results.isValid) return;
    generatePricingPDF(inputs, results, channel);
    toast.success("PDF exportado!");
  };

  const isNegative = results.margemPct < 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Precificadora</h1>
          <p className="text-muted-foreground text-sm">
            Descubra se o seu preço de venda cobre todos os custos e gera lucro.
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
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!results.isValid}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Title */}
      <Input
        placeholder="Título do produto (ex: Camiseta Oversized PP)"
        value={inputs.title}
        onChange={(e) => updateInput("title", e.target.value)}
        className="text-base font-medium h-10"
      />

      {/* Channel selector — visible on mobile before costs */}
      <div className="lg:hidden">
        <ChannelSelector channel={channel} onChange={handleChannelChange} />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
        {/* A) PRODUTO */}
        <Card className="self-start">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {/* Channel selector — desktop only */}
            <div className="hidden lg:block">
              <ChannelSelector channel={channel} onChange={handleChannelChange} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preço de Venda</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <Input type="number" min="0" placeholder="0.00" value={inputs.sellingPrice} onChange={(e) => updateInput("sellingPrice", e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Custo do Produto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <Input type="number" min="0" placeholder="0.00" value={inputs.productCost} onChange={(e) => updateInput("productCost", e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B) CUSTOS PERCENTUAIS */}
        <Card className="self-start">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Custos Percentuais</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_70px_80px] gap-2 text-[11px] font-medium text-muted-foreground px-0.5">
                <span>Item</span>
                <span className="text-center">%</span>
                <span className="text-right">R$</span>
              </div>
              {costRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_70px_80px] gap-2 items-center">
                  <Label className="text-xs truncate">{row.label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={inputs[row.inputKey]}
                      onChange={(e) => updateInput(row.inputKey, e.target.value)}
                      className="pr-6 text-center h-8 text-xs"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-right tabular-nums">
                    R$ {results.values[row.key].toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Shopee-specific rows */}
              {channel === "shopee" && (
                <>
                  <div className="border-t border-border my-1" />
                  <div className="grid grid-cols-[1fr_70px_80px] gap-2 items-center">
                    <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Tarifa Fixa Shopee
                    </Label>
                    <span className="text-xs text-center text-muted-foreground">—</span>
                    <span className="text-xs text-right tabular-nums text-orange-400 font-medium">
                      R$ {results.shopeeTarifa.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_70px_80px] gap-2 items-center">
                    <Label className="text-xs truncate text-orange-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Comissão Shopee
                    </Label>
                    <span className="text-xs text-center tabular-nums text-orange-400">
                      {results.shopeeComissaoPct}%
                    </span>
                    <span className="text-xs text-right tabular-nums text-orange-400 font-medium">
                      R$ {results.shopeeComissaoRS.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C) RESULTADOS */}
        <Card className={`self-start lg:sticky lg:top-4 ${isNegative && results.isValid ? "border-destructive/50" : ""}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              Resultados
              {results.isValid && (
                isNegative
                  ? <AlertTriangle className="h-4 w-4 text-destructive" />
                  : <CheckCircle className="h-4 w-4 text-success" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {results.isValid ? (
              <div className="space-y-3">
                <ResultRow label="Custo Venda Total" value={`R$ ${results.custoVendaTotal.toFixed(2)}`} />
                <ResultRow label="Custo Total" value={`R$ ${results.custoTotal.toFixed(2)}`} />
                <div className="border-t border-border pt-3 space-y-3">
                  {/* Lucro Líquido highlight */}
                  <div className={`rounded-lg p-3 text-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Lucro Líquido</p>
                    <p className={`text-2xl font-bold tabular-nums ${isNegative ? "text-destructive" : "text-success"}`}>
                      R$ {results.lucroLiquido.toFixed(2)}
                    </p>
                  </div>
                  {/* Margem % highlight */}
                  <div className={`rounded-lg p-3 text-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Margem</p>
                    <p className={`text-2xl font-bold tabular-nums ${isNegative ? "text-destructive" : "text-success"}`}>
                      {results.margemPct.toFixed(1)}%
                    </p>
                  </div>
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

      <SaveProductDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        inputs={inputs}
        editingProductId={editingProductId}
        onSaved={() => setEditingProductId(null)}
      />

      <SavedProductsList
        open={productsListOpen}
        onOpenChange={setProductsListOpen}
        onLoadProduct={handleLoadProduct}
      />
    </div>
  );
}

/* ── Channel Selector ── */
function ChannelSelector({ channel, onChange }: { channel: Channel; onChange: (v: string) => void }) {
  return (
    <Select value={channel} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="site">🌐 SITE</SelectItem>
        <SelectItem value="shopee">🟠 SHOPEE</SelectItem>
        <SelectItem value="temu" disabled>TEMU — em breve</SelectItem>
        <SelectItem value="tiktokshop" disabled>TikTok Shop — em breve</SelectItem>
        <SelectItem value="shein" disabled>SHEIN — em breve</SelectItem>
        <SelectItem value="meli" disabled>Mercado Livre — em breve</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* ── Result Row ── */
function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: "positive" | "negative" }) {
  const colorClass = highlight === "negative" ? "text-destructive" : highlight === "positive" ? "text-success" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}
