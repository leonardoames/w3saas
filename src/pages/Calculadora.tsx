import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Save, FolderOpen, FileDown, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveProductDialog } from "@/components/precificadora/SaveProductDialog";
import { SavedProductsList } from "@/components/precificadora/SavedProductsList";
import { generatePricingPDF } from "@/lib/pricingPdf";

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

function useCalculatorResults(inputs: ProductInputs) {
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
    const custoVendaTotal = Object.values(values).reduce((a, b) => a + b, 0);
    const custoTotal = productCost + custoVendaTotal;
    const margemRS = sellingPrice - custoTotal;
    const margemPct = sellingPrice > 0 ? (margemRS / sellingPrice) * 100 : 0;
    return { sellingPrice, productCost, pcts, values, custoVendaTotal, custoTotal, margemRS, margemPct, isValid: sellingPrice > 0 };
  }, [inputs]);
}

const costRows: { key: keyof ReturnType<typeof useCalculatorResults>["pcts"]; label: string; inputKey: keyof ProductInputs }[] = [
  { key: "mediaCost", label: "Custo de Mídia", inputKey: "mediaCost" },
  { key: "fixedCosts", label: "Custos Fixos", inputKey: "fixedCosts" },
  { key: "taxes", label: "Impostos", inputKey: "taxes" },
  { key: "gatewayFee", label: "Taxa do Gateway", inputKey: "gatewayFee" },
  { key: "platformFee", label: "Taxa da Plataforma", inputKey: "platformFee" },
  { key: "extraFees", label: "Taxas Extras", inputKey: "extraFees" },
];

export default function Calculadora() {
  const [inputs, setInputs] = useState<ProductInputs>(defaultInputs);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [productsListOpen, setProductsListOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const results = useCalculatorResults(inputs);

  const updateInput = (key: keyof ProductInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
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
    generatePricingPDF(inputs, results);
    toast.success("PDF exportado!");
  };

  const isNegative = results.margemPct < 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Precificadora de E-commerce</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Descubra se o seu preço de venda cobre todos os custos e gera lucro.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setProductsListOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-1" />
            Meus Produtos
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!results.isValid}>
            <FileDown className="h-4 w-4 mr-1" />
            Exportar PDF
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!results.isValid}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Title Field */}
      <div>
        <Input
          placeholder="Título do produto (ex: Camiseta Oversized PP)"
          value={inputs.title}
          onChange={(e) => updateInput("title", e.target.value)}
          className="text-lg font-medium h-12"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* A) PRODUTO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Preço de Venda</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input type="number" placeholder="0.00" value={inputs.sellingPrice} onChange={(e) => updateInput("sellingPrice", e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Custo do Produto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input type="number" placeholder="0.00" value={inputs.productCost} onChange={(e) => updateInput("productCost", e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B) CUSTOS PERCENTUAIS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custos Percentuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_90px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Item</span>
                <span className="text-center">%</span>
                <span className="text-right">R$</span>
              </div>
              {costRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_80px_90px] gap-2 items-center">
                  <Label className="text-sm truncate">{row.label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={inputs[row.inputKey]}
                      onChange={(e) => updateInput(row.inputKey, e.target.value)}
                      className="pr-7 text-center h-9 text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-right tabular-nums">
                    R$ {results.values[row.key].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* C) RESULTADOS */}
        <Card className={isNegative && results.isValid ? "border-destructive/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Resultados
              {results.isValid && (
                isNegative
                  ? <AlertTriangle className="h-4 w-4 text-destructive" />
                  : <CheckCircle className="h-4 w-4 text-success" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.isValid ? (
              <div className="space-y-4">
                <ResultRow label="Custo Venda Total" value={`R$ ${results.custoVendaTotal.toFixed(2)}`} />
                <ResultRow label="Custo Total" value={`R$ ${results.custoTotal.toFixed(2)}`} />
                <div className="border-t border-border pt-4 space-y-3">
                  <ResultRow label="Margem (R$)" value={`R$ ${results.margemRS.toFixed(2)}`} highlight={isNegative ? "negative" : "positive"} />
                  <div className={`rounded-lg p-4 text-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}>
                    <p className="text-xs text-muted-foreground mb-1">Margem</p>
                    <p className={`text-3xl font-bold tabular-nums ${isNegative ? "text-destructive" : "text-success"}`}>
                      {results.margemPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground text-center text-sm">
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

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: "positive" | "negative" }) {
  const colorClass = highlight === "negative" ? "text-destructive" : highlight === "positive" ? "text-success" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}
