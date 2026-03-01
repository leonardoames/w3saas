import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Loader2, FileText, ShoppingBag, Search, BarChart3, Megaphone, Video, Plus, Mic, Send, X, Trash2, ImagePlus } from "lucide-react";
import HtmlPreviewMessage, { hasHtmlContent } from "@/components/ia-w3/HtmlPreviewMessage";
import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = attachedImages.length;
    const remaining = 3 - currentCount;
    if (remaining <= 0) {
      toast({ title: "Limite atingido", description: "Máximo de 3 imagens por mensagem", variant: "destructive" });
      return;
    }

    const validFiles = files.slice(0, remaining).filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "Arquivo inválido", description: `${f.name} não é uma imagem`, variant: "destructive" });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${f.name} excede 5MB`, variant: "destructive" });
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setAttachedImages(prev => [...prev, ...newImages]);

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async (customPrompt?: string) => {
    const messageToSend = customPrompt || prompt;
    
    if (!messageToSend.trim() && attachedImages.length === 0) {
      toast({
        title: "Campo vazio",
        description: "Por favor, descreva o que você precisa",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setFollowUpQuestions([]);

    // Convert images to base64
    let imageBase64s: string[] = [];
    if (attachedImages.length > 0) {
      try {
        imageBase64s = await Promise.all(attachedImages.map(img => fileToBase64(img.file)));
      } catch {
        toast({ title: "Erro", description: "Falha ao processar imagens", variant: "destructive" });
        setIsGenerating(false);
        return;
      }
    }

    // Add user message to history immediately
    const newUserMessage: ChatMessage = {
      role: "user",
      content: messageToSend || (imageBase64s.length > 0 ? "Analise esta(s) imagem(ns)" : ""),
      images: imageBase64s.length > 0 ? imageBase64s : undefined,
    };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setPrompt("");
    // Clean up previews
    attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setAttachedImages([]);

    try {
      const { data, error } = await supabase.functions.invoke("ia-w3", {
        body: {
          userMessage: newUserMessage.content,
          mode: selectedMode,
          chatHistory: chatHistory,
          images: imageBase64s.length > 0 ? imageBase64s : undefined,
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
      setFollowUpQuestions(data.followUpQuestions || []);
    } catch (error) {
      console.error("Error generating content:", error);
      
      // Remove the user message if there was an error
      setChatHistory(chatHistory);
      
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

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ""));
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
    setFollowUpQuestions([]);
    toast({
      title: "Conversa limpa",
      description: "O histórico foi reiniciado",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const selectedModeData = MODES.find(m => m.id === selectedMode);

  // Sanitize HTML for messages
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
        'h2', 'h3', 'h4', 'h5', 'h6',
        'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
        'style', 'a', 'button'
      ],
      ALLOWED_ATTR: ['class', 'style', 'href'],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header with mode indicator and clear button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">IA W3</span>
          {selectedModeData && (
            <span className="text-sm text-muted-foreground">
              • {selectedModeData.label}
            </span>
          )}
        </div>
        {chatHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {chatHistory.length === 0 ? (
          // Empty state - welcome screen
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Como posso ajudar?
              </h1>
              <p className="text-muted-foreground">
                Assistente de performance para e-commerce: diagnóstico, copy, SEO e muito mais
              </p>
            </div>
            
            {/* Mode suggestions */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "gap-2",
                    selectedMode === mode.id && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  )}
                >
                  {mode.icon}
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          // Chat messages
          <div className="max-w-5xl mx-auto space-y-6">
            {chatHistory.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "group relative rounded-2xl",
                    message.role === "user"
                      ? "max-w-[85%] px-4 py-3 bg-primary text-primary-foreground"
                      : hasHtmlContent(message.content)
                        ? "w-full max-w-full p-0 bg-transparent"
                        : "max-w-[85%] px-4 py-3 bg-muted/50"
                  )}
                >
                {message.role === "user" ? (
                    <div>
                      {message.images && message.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.images.map((img, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={img}
                              alt={`Anexo ${imgIdx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-primary-foreground/20"
                            />
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : hasHtmlContent(message.content) ? (
                    <HtmlPreviewMessage content={message.content} />
                  ) : (
                    <>
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.content) }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleCopyMessage(message.content)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isGenerating && (
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {followUpQuestions.length > 0 && !isGenerating && (
              <div className="flex flex-wrap gap-2 pl-12">
                {followUpQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFollowUp(question)}
                    className="text-sm"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="border-t border-border/50 bg-background px-4 py-4">
        <div className="max-w-5xl mx-auto">
          {/* Image previews above input */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl bg-muted/50 border border-border/50 px-3 py-2">
            {/* Plus menu for modes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full hover:bg-muted"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {MODES.map((mode) => (
                  <DropdownMenuItem
                    key={mode.id}
                    onClick={() => setSelectedMode(selectedMode === mode.id ? null : mode.id)}
                    className={cn(
                      "gap-3 cursor-pointer",
                      selectedMode === mode.id && "bg-primary/10"
                    )}
                  >
                    <span className="text-primary">{mode.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </div>
                    {selectedMode === mode.id && (
                      <X className="h-4 w-4 ml-auto text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedModeData ? `${selectedModeData.label}: ${selectedModeData.description}` : "Pergunte alguma coisa..."}
              className="flex-1 resize-none bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground py-2 max-h-[200px] min-h-[24px]"
              rows={1}
              disabled={isGenerating}
            />

            {/* Image upload button */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full hover:bg-muted text-muted-foreground"
              disabled={isGenerating}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>

            {/* Audio button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full hover:bg-muted text-muted-foreground"
              disabled={isGenerating}
              onClick={() => toast({ title: "Em breve", description: "Entrada de áudio em desenvolvimento" })}
            >
              <Mic className="h-5 w-5" />
            </Button>

            {/* Send button */}
            <Button
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0 rounded-full transition-colors",
                prompt.trim() ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground"
              )}
              disabled={isGenerating || (!prompt.trim() && attachedImages.length === 0)}
              onClick={() => handleGenerate()}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Selected mode indicator */}
          {selectedModeData && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Modo:</span>
              <span className="flex items-center gap-1 text-primary">
                {selectedModeData.icon}
                {selectedModeData.label}
              </span>
              <button
                onClick={() => setSelectedMode(null)}
                className="hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
