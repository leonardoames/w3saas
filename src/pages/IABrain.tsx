import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentUploader } from "@/components/ia-brain/DocumentUploader";
import { DocumentList } from "@/components/ia-brain/DocumentList";
import { DocumentViewerDialog } from "@/components/ia-brain/DocumentViewerDialog";

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

export default function IABrain() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("ia_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as Document[]) || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("iaw3-brain")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase.from("ia_documents").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: fileExtension,
        file_size: file.size,
        status: "pending",
      });

      if (dbError) throw dbError;

      toast({
        title: "Upload realizado!",
        description: "O documento será processado em instantes.",
      });

      // Trigger processing
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        supabase.functions.invoke("process-ia-document", {
          body: { filePath },
        }).catch(console.error);
      }

      await fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const doc = documents.find((d) => d.id === documentId);
      
      if (doc) {
        // Delete from storage
        await supabase.storage.from("iaw3-brain").remove([doc.file_name]);
      }

      // Delete from database
      const { error } = await supabase
        .from("ia_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      
      toast({
        title: "Documento removido",
        description: "O documento foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover o documento",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (document: Document) => {
    setViewingDocument(document);
  };

  const documentCount = documents.length;
  const readyCount = documents.filter((d) => d.status === "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/ia-w3">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Cérebro da IA
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie os documentos que a IA W3 consulta para respostas personalizadas
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <DocumentUploader
            onUpload={handleUpload}
            isUploading={isUploading}
            disabled={documentCount >= 50}
          />
          
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{documentCount}</p>
                  <p className="text-xs text-muted-foreground">Documentos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{readyCount}</p>
                  <p className="text-xs text-muted-foreground">Prontos</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Limite: 50 documentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Seus Documentos</CardTitle>
              <CardDescription>
                Documentos processados ficam disponíveis para consulta pela IA W3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={documents}
                onDelete={handleDelete}
                onView={handleView}
                deletingId={deletingId || undefined}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentViewerDialog
        document={viewingDocument}
        open={!!viewingDocument}
        onOpenChange={(open) => !open && setViewingDocument(null)}
      />
    </div>
  );
}
