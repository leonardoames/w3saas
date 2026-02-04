import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message?: string;
  created_at: string;
  content_text?: string;
}

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onView: (document: Document) => void;
  isDeleting?: boolean;
}

export function DocumentCard({ document, onDelete, onView, isDeleting }: DocumentCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = () => {
    switch (document.status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Pendente
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Pronto
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">{document.status}</Badge>;
    }
  };

  const getFileIcon = () => {
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium truncate" title={document.file_name}>
                  {document.file_name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{formatFileSize(document.file_size)}</span>
                  <span>•</span>
                  <span>{document.file_type.toUpperCase()}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(document.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge()}
              </div>
            </div>

            {document.error_message && (
              <p className="mt-2 text-sm text-destructive">
                {document.error_message}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              {document.status === "ready" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(document)}
                  className="gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Ver conteúdo
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(document.id)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
