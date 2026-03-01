import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Code, Copy, Monitor, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HtmlPreviewMessageProps {
  content: string;
}

export function hasHtmlContent(html: string): boolean {
  return (
    /<style[\s>]/i.test(html) ||
    /class="w3-/i.test(html) ||
    /<table[\s>]/i.test(html) ||
    /<div[^>]+style="/i.test(html)
  );
}

export default function HtmlPreviewMessage({ content }: HtmlPreviewMessageProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copiado!", description: "Código HTML copiado para a área de transferência" });
  };

  const iframeDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111;}</style></head><body>${content}</body></html>`;

  return (
    <div className="w-full">
      {/* Toggle bar */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <button
          onClick={() => setView("preview")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            view === "preview"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/80 text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          onClick={() => setView("code")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            view === "code"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/80 text-muted-foreground hover:text-foreground"
          )}
        >
          <Code className="h-3.5 w-3.5" />
          Código
        </button>

        {/* Viewport toggle - only visible in preview mode */}
        {view === "preview" && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setDevice("desktop")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                device === "desktop"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                device === "mobile"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="ml-auto h-7 px-2 text-xs text-muted-foreground"
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar
        </Button>
      </div>

      {/* Content */}
      {view === "preview" ? (
        <div className={cn(
          "flex justify-center rounded-lg border border-border/50 bg-muted/30 p-4",
          device === "mobile" && "py-6"
        )}>
          <div className={cn(
            device === "mobile" && "border-[10px] border-foreground/80 rounded-[2.5rem] shadow-xl overflow-hidden bg-white",
            device === "desktop" && "w-full"
          )}>
            {/* Mobile notch */}
            {device === "mobile" && (
              <div className="bg-foreground/80 flex justify-center py-1">
                <div className="w-20 h-5 bg-black rounded-b-xl" />
              </div>
            )}
            <iframe
              srcDoc={iframeDoc}
              sandbox="allow-scripts"
              className={cn(
                "bg-white",
                device === "desktop" && "w-full min-h-[700px]",
                device === "mobile" && "w-[375px] h-[700px]"
              )}
              style={{ colorScheme: "light" }}
              title="Preview HTML"
            />
          </div>
        </div>
      ) : (
        <pre className="overflow-x-auto rounded-lg bg-muted/80 border border-border/50 p-4 text-xs leading-relaxed max-h-[500px] overflow-y-auto">
          <code className="text-foreground whitespace-pre-wrap break-words">{content}</code>
        </pre>
      )}
    </div>
  );
}
