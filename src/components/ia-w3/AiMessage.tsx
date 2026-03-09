import { Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
import DOMPurify from "dompurify";

interface AiMessageProps {
  content: string;
  onCopy: (content: string) => void;
}

/** Convert markdown-style text to HTML for rendering */
function markdownToHtml(text: string): string {
  let html = text;

  // Escape any raw HTML that isn't already tags we want
  // But first, preserve existing HTML tags the model might send
  const hasHtmlTags = /<(p|br|strong|em|ul|ol|li|h[2-6]|div|span|table|tr|td|th|thead|tbody|code|pre|blockquote|hr|a)\b/i.test(html);

  if (!hasHtmlTags) {
    // Pure markdown content — convert it

    // Headers: ### → h3, ## → h2, #### → h4
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Bold + italic: ***text*** or ___text___
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (but not inside words with underscores)
    html = html.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>');

    // Inline code: `code`
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Code blocks: ```...```
    html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Blockquotes: > text
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Unordered lists: - item or * item
    html = html.replace(/^(?:[-*])\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Ordered lists: 1. item
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Wrap in <ol> — detect by checking if <li> not already inside <ul>
    html = html.replace(/(?<!<\/ul>)\n?((?:<li>.*<\/li>\n?)+)/g, (match, group) => {
      // If already wrapped in <ul>, skip
      if (match.includes('<ul>')) return match;
      return `<ol>${group}</ol>`;
    });

    // Paragraphs: double newline
    html = html.replace(/\n\n+/g, '</p><p>');
    // Single newlines within paragraphs → <br>
    html = html.replace(/(?<!>)\n(?!<)/g, '<br>');
    // Wrap in <p> if not starting with a block element
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    // Don't wrap block elements in <p>
    html = html.replace(/<p>(<(?:h[2-6]|ul|ol|pre|blockquote|hr|table))/g, '$1');
    html = html.replace(/(<\/(?:h[2-6]|ul|ol|pre|blockquote|hr|table)>)<\/p>/g, '$1');
  }

  return html;
}

export default function AiMessage({ content, onCopy }: AiMessageProps) {
  const [copied, setCopied] = useState(false);

  const sanitized = useMemo(() => {
    const html = markdownToHtml(content);
    return DOMPurify.sanitize(html, {
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
  }, [content]);

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
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="text-success">Copiado</span>
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
