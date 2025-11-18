import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator as CalculatorIcon } from "lucide-react";
import { useState } from "react";

export default function Calculadora() {
  const [inputs, setInputs] = useState({
    productCost: "",
    productionCost: "",
    fees: "",
    fixedCosts: "",
    variableCosts: "",
    cac: "",
    investment: "",
    desiredMargin: "",
  });

  const [results, setResults] = useState<{
    idealPrice: number;
    breakEven: number;
    profitPerUnit: number;
    netMargin: number;
    requiredRoas: number;
  } | null>(null);

  const handleCalculate = () => {
    // Lógica de cálculo simplificada - será refinada depois
    const totalCost = 
      parseFloat(inputs.productCost || "0") + 
      parseFloat(inputs.productionCost || "0") +
      parseFloat(inputs.fees || "0") +
      parseFloat(inputs.fixedCosts || "0") +
      parseFloat(inputs.variableCosts || "0");

    const margin = parseFloat(inputs.desiredMargin || "30") / 100;
    const idealPrice = totalCost / (1 - margin);
    const profitPerUnit = idealPrice - totalCost;
    const netMargin = (profitPerUnit / idealPrice) * 100;
    
    const cac = parseFloat(inputs.cac || "0");
    const breakEven = cac > 0 ? Math.ceil(cac / profitPerUnit) : 0;
    
    const investment = parseFloat(inputs.investment || "0");
    const requiredRoas = investment > 0 ? idealPrice / (investment + cac) : 0;

    setResults({
      idealPrice,
      breakEven,
      profitPerUnit,
      netMargin,
      requiredRoas,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Calculadora de E-commerce</h1>
        <p className="mt-2 text-muted-foreground">
          Calcule o preço ideal, margem de lucro e ROAS necessário para seu produto
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productCost">Custo do Produto (R$)</Label>
              <Input
                id="productCost"
                type="number"
                placeholder="0.00"
                value={inputs.productCost}
                onChange={(e) => setInputs({ ...inputs, productCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productionCost">Custo de Produção/Compra (R$)</Label>
              <Input
                id="productionCost"
                type="number"
                placeholder="0.00"
                value={inputs.productionCost}
                onChange={(e) => setInputs({ ...inputs, productionCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees">Taxas (R$)</Label>
              <Input
                id="fees"
                type="number"
                placeholder="0.00"
                value={inputs.fees}
                onChange={(e) => setInputs({ ...inputs, fees: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixedCosts">Custos Fixos (R$)</Label>
              <Input
                id="fixedCosts"
                type="number"
                placeholder="0.00"
                value={inputs.fixedCosts}
                onChange={(e) => setInputs({ ...inputs, fixedCosts: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variableCosts">Custos Variáveis (R$)</Label>
              <Input
                id="variableCosts"
                type="number"
                placeholder="0.00"
                value={inputs.variableCosts}
                onChange={(e) => setInputs({ ...inputs, variableCosts: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cac">CAC Hipotético (R$)</Label>
              <Input
                id="cac"
                type="number"
                placeholder="0.00"
                value={inputs.cac}
                onChange={(e) => setInputs({ ...inputs, cac: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment">Investimento Esperado (R$)</Label>
              <Input
                id="investment"
                type="number"
                placeholder="0.00"
                value={inputs.investment}
                onChange={(e) => setInputs({ ...inputs, investment: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredMargin">Margem Desejada (%)</Label>
              <Input
                id="desiredMargin"
                type="number"
                placeholder="30"
                value={inputs.desiredMargin}
                onChange={(e) => setInputs({ ...inputs, desiredMargin: e.target.value })}
              />
            </div>

            <Button onClick={handleCalculate} className="w-full" size="lg">
              <CalculatorIcon className="mr-2 h-5 w-5" />
              Calcular
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {results ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Preço Ideal</p>
                    <p className="text-3xl font-bold text-primary">
                      R$ {results.idealPrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Lucro por Unidade</p>
                      <p className="text-xl font-semibold text-success">
                        R$ {results.profitPerUnit.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Margem Líquida</p>
                      <p className="text-xl font-semibold">
                        {results.netMargin.toFixed(1)}%
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ponto de Equilíbrio</p>
                      <p className="text-xl font-semibold">
                        {results.breakEven} vendas
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">ROAS Necessário</p>
                      <p className="text-xl font-semibold text-accent">
                        {results.requiredRoas.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  Preencha os dados e clique em Calcular
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
