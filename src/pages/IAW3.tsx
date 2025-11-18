import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function IAW3() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Campo vazio",
        description: "Por favor, descreva o que você precisa",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulação - será substituído pela integração real com IA depois
    setTimeout(() => {
      setOutput(`<h2>Título Otimizado para SEO</h2>
<p>Este é um exemplo de saída gerado pela IA W3.</p>
<p>Em breve, a IA estará conectada e gerará conteúdo real para:</p>
<ul>
  <li>Descrições de produtos em HTML</li>
  <li>Títulos otimizados para SEO</li>
  <li>Sugestões de categorias e tags</li>
  <li>Melhorias de SEO</li>
</ul>
<p>Tudo escrito no tom direto e estratégico do Leonardo Ames.</p>`);
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copiado!",
      description: "HTML copiado para a área de transferência",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">IA W3</h1>
        <p className="mt-2 text-muted-foreground">
          Assistente de conteúdo para e-commerce: descrições, títulos, SEO e muito mais
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>O que você precisa?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: Crie uma descrição em HTML para um tênis esportivo feminino, focando em conforto e performance..."
              className="min-h-[300px] resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button 
              onClick={handleGenerate} 
              className="w-full" 
              size="lg"
              disabled={isGenerating}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGenerating ? "Gerando..." : "Gerar Conteúdo"}
            </Button>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium text-foreground">Dicas de uso:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Seja específico sobre o produto ou conteúdo</li>
                <li>• Mencione o público-alvo</li>
                <li>• Indique o tom desejado (técnico, persuasivo, etc.)</li>
                <li>• Para SEO, mencione palavras-chave importantes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Resultado</CardTitle>
            {output && (
              <Button variant="outline" size="sm" onClick={handleCopyHTML}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar HTML
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {output ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: output }}
                  />
                </div>
                <div className="rounded-lg bg-card p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Código HTML:</p>
                  <pre className="overflow-x-auto text-xs text-muted-foreground">
                    <code>{output}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                O conteúdo gerado aparecerá aqui
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
