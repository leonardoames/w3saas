import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  content_text?: string;
}

interface DocumentViewerDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewerDialog({ 
  document, 
  open, 
  onOpenChange 
}: DocumentViewerDialogProps) {
  if (!document) return null;

  const wordCount = document.content_text?.split(/\s+/).length || 0;
  const charCount = document.content_text?.length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] bg-[#111111] border-l border-[#242424] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-[#242424]">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            {document.file_name}
          </SheetTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">{document.file_type.toUpperCase()}</Badge>
            <Badge variant="secondary">{wordCount.toLocaleString()} palavras</Badge>
            <Badge variant="secondary">{charCount.toLocaleString()} caracteres</Badge>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6 py-5">
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg">
            {document.content_text ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {document.content_text}
              </pre>
            ) : (
              <p className="text-muted-foreground italic">
                Conteúdo não disponível
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
