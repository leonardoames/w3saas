import { DocumentCard } from "./DocumentCard";
import { FileText } from "lucide-react";

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

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  onView: (document: Document) => void;
  deletingId?: string;
  isLoading?: boolean;
}

export function DocumentList({ 
  documents, 
  onDelete, 
  onView, 
  deletingId,
  isLoading 
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Nenhum documento</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Faça upload de documentos para a IA W3 consultar nas respostas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={onDelete}
          onView={onView}
          isDeleting={deletingId === doc.id}
        />
      ))}
    </div>
  );
}
