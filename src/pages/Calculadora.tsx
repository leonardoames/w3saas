import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            id={id}
            type="number"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
        <span className="text-sm text-muted-foreground min-w-[80px] text-right">= R$ {calculatedValue.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface CurrencyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function CurrencyInput({ id, label, value, onChange, placeholder = "0.00" }: CurrencyInputProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
        <Input
          id={id}
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}

export default function Calculadora() {
  const [inputs, setInputs] = useState({
    sellingPrice: "",
    desiredMargin: "",
    productCost: "",
    mediaCost: "",
    fixedCosts: "",
    taxes: "",
    gatewayFee: "",
    platformFee: "",
    extraFees: "",
  });

  const updateInput = (key: keyof typeof inputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const results = useMemo(() => {
    const sellingPrice = parseFloat(inputs.sellingPrice || "0");
    const productCost = parseFloat(inputs.productCost || "0");

    // Convert percentages to currency
    const mediaCostValue = (sellingPrice * parseFloat(inputs.mediaCost || "0")) / 100;
    const fixedCostsValue = (sellingPrice * parseFloat(inputs.fixedCosts || "0")) / 100;
    const taxesValue = (sellingPrice * parseFloat(inputs.taxes || "0")) / 100;
    const gatewayFeeValue = (sellingPrice * parseFloat(inputs.gatewayFee || "0")) / 100;
    const platformFeeValue = (sellingPrice * parseFloat(inputs.platformFee || "0")) / 100;
    const extraFeesValue = (sellingPrice * parseFloat(inputs.extraFees || "0")) / 100;

    const totalOperationalCost =
      mediaCostValue + fixedCostsValue + taxesValue + gatewayFeeValue + platformFeeValue + extraFeesValue;
    const totalCost = productCost + totalOperationalCost;
    const profitPerUnit = sellingPrice - totalCost;
    const margin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    return {
      totalCost,
      profitPerUnit,
      margin,
      isValid: sellingPrice > 0,
    };
  }, [inputs]);

  const getMarginColor = () => {
    if (results.margin >= parseFloat(inputs.desiredMargin || "0")) return "text-success";
    if (results.margin > 0) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Calculadora de E-commerce</h1>
        <p className="mt-2 text-muted-foreground">
          Descubra rapidamente se o seu preço de venda cobre todos os custos e gera o lucro desejado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="space-y-6">
          {/* Product & Target */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Produto e Meta</CardTitle>
              <p className="text-sm text-muted-foreground">
                Defina o preço de venda, o custo do produto e a margem que você deseja atingir.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput
                id="sellingPrice"
                label="Preço de Venda"
                value={inputs.sellingPrice}
                onChange={(v) => updateInput("sellingPrice", v)}
              />
              <CurrencyInput
                id="productCost"
                label="Custo do Produto (fabricação ou compra)"
                value={inputs.productCost}
                onChange={(v) => updateInput("productCost", v)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="desiredMargin" className="text-sm">
                  Margem Desejada
                </Label>
                <div className="relative">
                  <Input
                    id="desiredMargin"
                    type="number"
                    placeholder="30"
                    value={inputs.desiredMargin}
                    onChange={(e) => updateInput("desiredMargin", e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Costs (Percentages) */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Custos</CardTitle>
              <p className="text-sm text-muted-foreground">Percentuais aplicados sobre o preço de venda.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <PercentageInput
                id="mediaCost"
                label="Custo de Mídia"
                value={inputs.mediaCost}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("mediaCost", v)}
              />
              <PercentageInput
                id="fixedCosts"
                label="Custos Fixos"
                value={inputs.fixedCosts}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("fixedCosts", v)}
              />
              <PercentageInput
                id="taxes"
                label="Impostos"
                value={inputs.taxes}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("taxes", v)}
              />
              <Separator className="my-2" />
              <PercentageInput
                id="gatewayFee"
                label="Taxa do Gateway de Pagamento"
                value={inputs.gatewayFee}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("gatewayFee", v)}
              />
              <PercentageInput
                id="platformFee"
                label="Taxa da Plataforma de E-commerce"
                value={inputs.platformFee}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("platformFee", v)}
              />
              <PercentageInput
                id="extraFees"
                label="Taxas Extras"
                value={inputs.extraFees}
                sellingPrice={parseFloat(inputs.sellingPrice || "0")}
                onChange={(v) => updateInput("extraFees", v)}
              />
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
                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Custo Total</p>
                    <p className="text-4xl font-bold tracking-tight">R$ {results.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Soma de todos os custos por unidade</p>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Lucro por Unidade</p>
                    <p
                      className={`text-4xl font-bold tracking-tight ${results.profitPerUnit >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      R$ {results.profitPerUnit.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Preço de venda menos custo total</p>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Margem Real</p>
                    <p className={`text-4xl font-bold tracking-tight ${getMarginColor()}`}>
                      {results.margin.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {parseFloat(inputs.desiredMargin || "0") > 0 &&
                        (results.margin >= parseFloat(inputs.desiredMargin)
                          ? "✓ Acima da meta"
                          : `Meta: ${inputs.desiredMargin}%`)}
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
    </div>
  );
}
