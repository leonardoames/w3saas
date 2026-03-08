import { Copy, Check } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";

interface AiMessageProps {
  content: string;
  onCopy: (content: string) => void;
}

export default function AiMessage({ content, onCopy }: AiMessageProps) {
  const [copied, setCopied] = useState(false);

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
      'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
      'style', 'a', 'button', 'code', 'pre', 'blockquote', 'hr',
    ],
    ALLOWED_ATTR: ['class', 'style', 'href'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
  });

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div
        className="ai-message"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      <div className="mt-2 flex items-center">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted/60"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
