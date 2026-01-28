import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Loader2, FileText, ShoppingBag, Search, BarChart3, Megaphone, Video } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Mode {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const MODES: Mode[] = [
  { id: "copy-site", label: "Copy Site", icon: <FileText className="h-4 w-4" />, description: "Descrição HTML premium para e-commerce" },
  { id: "copy-marketplace", label: "Marketplace", icon: <ShoppingBag className="h-4 w-4" />, description: "Texto otimizado para ML/Shopee" },
  { id: "seo", label: "SEO", icon: <Search className="h-4 w-4" />, description: "Otimização para buscadores" },
  { id: "diagnostico", label: "Diagnóstico", icon: <BarChart3 className="h-4 w-4" />, description: "Análise de métricas e gargalos" },
  { id: "anuncios", label: "Anúncios", icon: <Megaphone className="h-4 w-4" />, description: "Copy para Meta/Google Ads" },
  { id: "roteiro-influencer", label: "Influencer", icon: <Video className="h-4 w-4" />, description: "Roteiro storytelling em dias" },
];

export default function IAW3() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sanitize HTML output for XSS protection
  const sanitizedOutput = useMemo(() => {
    if (!output) return '';
    return DOMPurify.sanitize(output, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
        'h2', 'h3', 'h4', 'h5', 'h6',
        'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead'
      ],
      ALLOWED_ATTR: ['class'],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false,
    });
  }, [output]);

  useEffect(() => {
    if (outputRef.current && output) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleGenerate = async (customPrompt?: string) => {
    const messageToSend = customPrompt || prompt;
    
    if (!messageToSend.trim()) {
      toast({
        title: "Campo vazio",
        description: "Por favor, descreva o que você precisa",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setFollowUpQuestions([]);

    // Add user message to history
    const newUserMessage: ChatMessage = { role: "user", content: messageToSend };
    const updatedHistory = [...chatHistory, newUserMessage].slice(-20); // Keep last 10 turns (20 messages)

    try {
      const { data, error } = await supabase.functions.invoke("ia-w3", {
        body: {
          userMessage: messageToSend,
          mode: selectedMode,
          chatHistory: chatHistory, // Send previous history, not including current message
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erro ao chamar a IA");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = { role: "assistant", content: data.answerHtml };
      setChatHistory([...updatedHistory, assistantMessage].slice(-20));
      setOutput(data.answerHtml);
      setFollowUpQuestions(data.followUpQuestions || []);
      setPrompt("");
    } catch (error) {
      console.error("Error generating content:", error);
      
      let errorMessage = "Erro ao gerar conteúdo. Tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("Limite")) {
          errorMessage = "Muitas requisições. Aguarde alguns segundos e tente novamente.";
        } else if (error.message.includes("402") || error.message.includes("Créditos")) {
          errorMessage = "Créditos insuficientes. Entre em contato com o suporte.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copiado!",
      description: "Conteúdo copiado para a área de transferência",
    });
  };

  const handleFollowUp = (question: string) => {
    handleGenerate(question);
  };

  const handleClearHistory = () => {
    setChatHistory([]);
    setOutput("");
    setFollowUpQuestions([]);
    toast({
      title: "Histórico limpo",
      description: "A conversa foi reiniciada",
    });
  };

  const getPlaceholder = () => {
    switch (selectedMode) {
      case "copy-site":
        return "Descreva o produto: nome, benefícios, público-alvo, diferenciais... A IA vai gerar HTML premium de alta conversão.";
      case "copy-marketplace":
        return "Descreva o produto para criar anúncio otimizado para Mercado Livre, Shopee, etc. Foco em palavras-chave.";
      case "seo":
        return "Cole a URL ou descreva a página que quer otimizar para buscadores...";
      case "diagnostico":
        return "Descreva o problema ou cole suas métricas (faturamento, conversão, ROAS, etc.)...";
      case "anuncios":
        return "Descreva a campanha, objetivo, público e produto para criar copies de anúncios...";
      case "roteiro-influencer":
        return "Descreva o produto, objetivo da campanha e perfil do influenciador. A IA criará um roteiro de storytelling em múltiplos dias com Reels.";
      default:
        return "Ex: Preciso melhorar minha taxa de conversão, está em 1.2% e quero chegar em 2%...";
    }
  };

  const selectedModeData = MODES.find(m => m.id === selectedMode);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">IA W3</h1>
        <p className="mt-2 text-muted-foreground">
          Assistente de performance para e-commerce: diagnóstico, copy, SEO e muito mais
        </p>
      </div>

      {/* Mode Selector */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MODES.map((mode) => (
            <Button
              key={mode.id}
              variant={selectedMode === mode.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMode(selectedMode === mode.id ? null : mode.id)}
              className="flex-col h-auto py-2 px-2 gap-1"
              title={mode.description}
            >
              {mode.icon}
              <span className="text-xs truncate w-full text-center">{mode.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {selectedModeData ? (
            <p className="text-sm text-muted-foreground">
              <strong>{selectedModeData.label}:</strong> {selectedModeData.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um modo acima</p>
          )}
          {chatHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-muted-foreground shrink-0"
            >
              Limpar conversa
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedModeData 
                ? `Modo: ${selectedModeData.label}` 
                : "O que você precisa?"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={getPlaceholder()}
              className="min-h-[200px] resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  handleGenerate();
                }
              }}
            />
            <Button
              onClick={() => handleGenerate()}
              className="w-full"
              size="lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Gerar Conteúdo
                </>
              )}
            </Button>

            <div className="rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium text-foreground">Dicas de uso:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Selecione um modo acima para respostas direcionadas</li>
                <li>• <strong>Copy Site:</strong> gera HTML premium com alta conversão</li>
                <li>• <strong>Influencer:</strong> cria roteiro de storytelling em dias</li>
                <li>• Use ⌘+Enter para enviar rapidamente</li>
              </ul>
            </div>

            {/* Chat History Preview */}
            {chatHistory.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Histórico ({Math.ceil(chatHistory.length / 2)} turnos)
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {chatHistory.slice(-6).map((msg, idx) => (
                    <p 
                      key={idx} 
                      className={`text-xs truncate ${
                        msg.role === "user" ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">
                        {msg.role === "user" ? "Você: " : "IA: "}
                      </span>
                      {msg.content.replace(/<[^>]*>/g, "").slice(0, 80)}...
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Resultado</CardTitle>
            {output && (
              <Button variant="outline" size="sm" onClick={handleCopyHTML}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Processando sua solicitação...</p>
                </div>
              </div>
            ) : output ? (
              <div className="space-y-4">
                <div 
                  ref={outputRef}
                  className="rounded-lg border border-border bg-muted/50 p-4 max-h-[350px] overflow-y-auto"
                >
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0"
                    dangerouslySetInnerHTML={{ __html: sanitizedOutput }}
                  />
                </div>
                
                {/* Follow-up Questions */}
                {followUpQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.map((question, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFollowUp(question)}
                        disabled={isGenerating}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Show HTML code only for copy-site mode */}
                {selectedMode === "copy-site" && (
                  <div className="rounded-lg bg-card border border-border p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">Código HTML:</p>
                    <pre className="overflow-x-auto text-xs text-muted-foreground max-h-[150px]">
                      <code>{output}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <Sparkles className="h-8 w-8 mx-auto opacity-50" />
                  <p>O conteúdo gerado aparecerá aqui</p>
                  <p className="text-xs">Selecione um modo e descreva sua necessidade</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
