import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowLeft, RefreshCw } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentUploader } from "@/components/ia-brain/DocumentUploader";
import { DocumentList } from "@/components/ia-brain/DocumentList";
import { DocumentViewerDialog } from "@/components/ia-brain/DocumentViewerDialog";
import { InstructionsManager } from "@/components/ia-brain/InstructionsManager";

interface IADocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message?: string;
  created_at: string;
  content_text?: string;
}

export default function IABrain() {
  const [documents, setDocuments] = useState<IADocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<IADocument | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const fetchDocuments = useCallback(async () => {
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
      toast({ title: "Erro", description: "Não foi possível carregar os documentos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  useEffect(() => {
    if (!user) return;
    const hasInProgress = documents.some((d) => d.status === "pending" || d.status === "processing");
    if (!hasInProgress) return;
    const interval = setInterval(() => { fetchDocuments(); }, 4000);
    return () => clearInterval(interval);
  }, [user, documents, fetchDocuments]);

  if (!isAdmin) return <Navigate to="/app" replace />;

  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[^\w\s.\-_()[\]]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim();
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("iaw3-brain").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("ia_documents").insert({
        user_id: user.id, file_name: file.name, file_path: filePath,
        file_type: fileExtension, file_size: file.size, status: "pending",
      });
      if (dbError) throw dbError;
      toast({ title: "Upload realizado!", description: "O documento será processado em instantes." });
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        supabase.functions.invoke("process-ia-document", { body: { filePath } }).catch(console.error);
      }
      await fetchDocuments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente";
      toast({ title: "Erro no upload", description: message, variant: "destructive" });
      throw new Error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocessPending = async () => {
    const docsToReprocess = documents.filter((d) => d.status === "pending" || d.status === "processing");
    if (docsToReprocess.length === 0) return;
    setIsReprocessing(true);
    try {
      docsToReprocess.forEach((doc) => {
        supabase.functions.invoke("process-ia-document", { body: { filePath: doc.file_path } }).catch(console.error);
      });
      toast({ title: "Reprocessamento iniciado", description: `${docsToReprocess.length} documento(s).` });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const doc = documents.find((d) => d.id === documentId);
      if (doc) await supabase.storage.from("iaw3-brain").remove([doc.file_name]);
      const { error } = await supabase.from("ia_documents").delete().eq("id", documentId);
      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast({ title: "Documento removido" });
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const documentCount = documents.length;
  const readyCount = documents.filter((d) => d.status === "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/ia-w3"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-8 w-8" /> Cérebro da IA
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie documentos e instruções que a IA W3 usa para respostas personalizadas.
              <span className="block text-sm text-primary">Compartilhados com todos os usuários.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {documents.some((d) => d.status === "pending" || d.status === "processing") && (
            <Button variant="outline" size="sm" onClick={handleReprocessPending} disabled={isReprocessing} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reprocessar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchDocuments} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="documentos" className="w-full">
        <TabsList>
          <TabsTrigger value="documentos">📄 Documentos</TabsTrigger>
          <TabsTrigger value="instrucoes">⚙️ Instruções</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <DocumentUploader onUpload={handleUpload} isUploading={isUploading} disabled={documentCount >= 50} />
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
                  <p className="text-xs text-muted-foreground text-center mt-3">Limite: 50 documentos</p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Seus Documentos</CardTitle>
                  <CardDescription>Documentos processados ficam disponíveis para consulta pela IA W3</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentList
                    documents={documents}
                    onDelete={handleDelete}
                    onView={(doc) => setViewingDocument(doc)}
                    deletingId={deletingId || undefined}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instrucoes">
          <Card>
            <CardHeader>
              <CardTitle>Instruções da IA</CardTitle>
              <CardDescription>
                Defina regras de comportamento: o que a IA deve fazer, não fazer, contexto do negócio e personalidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InstructionsManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentViewerDialog
        document={viewingDocument}
        open={!!viewingDocument}
        onOpenChange={(open) => !open && setViewingDocument(null)}
      />
    </div>
  );
}
