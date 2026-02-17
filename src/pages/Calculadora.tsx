import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Save, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveProductDialog } from "@/components/precificadora/SaveProductDialog";
import { SavedProductsList } from "@/components/precificadora/SavedProductsList";

interface PercentageInputProps {
  id: string;
  label: string;
  value: string;
  sellingPrice: number;
  onChange: (value: string) => void;
}

function PercentageInput({ id, label, value, sellingPrice, onChange }: PercentageInputProps) {
  const calculatedValue = useMemo(() => {
    const percentage = parseFloat(value || "0");
    return (sellingPrice * percentage) / 100;
  }, [value, sellingPrice]);

  return (
    <div className="flex items-center gap-4">
      <Label htmlFor={id} className="text-sm w-1/3 shrink-0">{label}</Label>
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1">
          <Input id={id} type="number" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className="pr-8" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
        <span className="text-sm text-muted-foreground min-w-[80px] text-right">= R$ {calculatedValue.toFixed(2)}</span>
      </div>
    </div>
  );
}

function CurrencyInput({ id, label, value, onChange, placeholder = "0.00" }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor={id} className="text-sm w-1/3 shrink-0">{label}</Label>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
        <Input id={id} type="number" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pl-10" />
      </div>
    </div>
  );
}

export interface ProductInputs {
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
  sellingPrice: "",
  productCost: "",
  mediaCost: "",
  fixedCosts: "",
  taxes: "",
  gatewayFee: "",
  platformFee: "",
  extraFees: "",
};

export default function Calculadora() {
  const [inputs, setInputs] = useState<ProductInputs>(defaultInputs);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [productsListOpen, setProductsListOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const updateInput = (key: keyof ProductInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const results = useMemo(() => {
    const sellingPrice = parseFloat(inputs.sellingPrice || "0");
    const productCost = parseFloat(inputs.productCost || "0");
    const mediaCostValue = (sellingPrice * parseFloat(inputs.mediaCost || "0")) / 100;
    const fixedCostsValue = (sellingPrice * parseFloat(inputs.fixedCosts || "0")) / 100;
    const taxesValue = (sellingPrice * parseFloat(inputs.taxes || "0")) / 100;
    const gatewayFeeValue = (sellingPrice * parseFloat(inputs.gatewayFee || "0")) / 100;
    const platformFeeValue = (sellingPrice * parseFloat(inputs.platformFee || "0")) / 100;
    const extraFeesValue = (sellingPrice * parseFloat(inputs.extraFees || "0")) / 100;
    const totalOperationalCost = mediaCostValue + fixedCostsValue + taxesValue + gatewayFeeValue + platformFeeValue + extraFeesValue;
    const totalCost = productCost + totalOperationalCost;
    const profitPerUnit = sellingPrice - totalCost;
    const margin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
    return { totalCost, profitPerUnit, margin, isValid: sellingPrice > 0 };
  }, [inputs]);

  const getMarginColor = () => {
    if (results.margin > 0) return "text-success";
    return "text-destructive";
  };

  const handleLoadProduct = (product: any) => {
    setInputs({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Precificadora de E-commerce</h1>
          <p className="mt-2 text-muted-foreground">
            Descubra rapidamente se o seu preço de venda cobre todos os custos e gera lucro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setProductsListOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-1" />
            Meus Produtos
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!results.isValid}>
            <Save className="h-4 w-4 mr-1" />
            Salvar Produto
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Produto</CardTitle>
              <p className="text-sm text-muted-foreground">Defina o preço de venda e o custo do produto.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput id="sellingPrice" label="Preço de Venda" value={inputs.sellingPrice} onChange={(v) => updateInput("sellingPrice", v)} />
              <CurrencyInput id="productCost" label="Custo do Produto" value={inputs.productCost} onChange={(v) => updateInput("productCost", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Custos</CardTitle>
              <p className="text-sm text-muted-foreground">Percentuais aplicados sobre o preço de venda.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <PercentageInput id="mediaCost" label="Custo de Mídia" value={inputs.mediaCost} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("mediaCost", v)} />
              <PercentageInput id="fixedCosts" label="Custos Fixos" value={inputs.fixedCosts} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("fixedCosts", v)} />
              <PercentageInput id="taxes" label="Impostos" value={inputs.taxes} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("taxes", v)} />
              <Separator className="my-2" />
              <PercentageInput id="gatewayFee" label="Taxa do Gateway" value={inputs.gatewayFee} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("gatewayFee", v)} />
              <PercentageInput id="platformFee" label="Taxa da Plataforma" value={inputs.platformFee} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("platformFee", v)} />
              <PercentageInput id="extraFees" label="Taxas Extras" value={inputs.extraFees} sellingPrice={parseFloat(inputs.sellingPrice || "0")} onChange={(v) => updateInput("extraFees", v)} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Resultados</CardTitle>
              <p className="text-sm text-muted-foreground">Atualizados automaticamente conforme você preenche.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {results.isValid ? (
                <>
                  <div className="rounded-lg p-6 text-center bg-accent">
                    <p className="text-sm text-muted-foreground mb-1">Custo Total</p>
                    <p className="text-4xl font-bold tracking-tight">R$ {results.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Soma de todos os custos por unidade</p>
                  </div>
                  <div className="rounded-lg p-6 text-center bg-accent">
                    <p className="text-sm text-muted-foreground mb-1">Lucro por Unidade</p>
                    <p className={`text-4xl font-bold tracking-tight ${results.profitPerUnit >= 0 ? "text-success" : "text-destructive"}`}>
                      R$ {results.profitPerUnit.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Preço de venda menos custo total</p>
                  </div>
                  <div className="rounded-lg p-6 text-center bg-accent">
                    <p className="text-sm text-muted-foreground mb-1">Margem Real</p>
                    <p className={`text-4xl font-bold tracking-tight ${getMarginColor()}`}>
                      {results.margin.toFixed(1)}%
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground text-center">
                  <p>Preencha o preço de venda para ver os resultados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
