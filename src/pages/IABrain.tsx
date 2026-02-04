import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowLeft, RefreshCw } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentUploader } from "@/components/ia-brain/DocumentUploader";
import { DocumentList } from "@/components/ia-brain/DocumentList";
import { DocumentViewerDialog } from "@/components/ia-brain/DocumentViewerDialog";

interface Document {
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh while there are docs being processed
  useEffect(() => {
    if (!user) return;
    const hasInProgress = documents.some(
      (d) => d.status === "pending" || d.status === "processing",
    );
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [user, documents, fetchDocuments]);

  // Redirect non-admins (after hooks)
  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // Sanitize filename for Supabase storage (remove emojis and special chars)
  const sanitizeFileName = (name: string): string => {
    // Remove emojis and special unicode characters, keep alphanumeric, spaces, dots, dashes, underscores
    return name
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, "") // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Flags
      .replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, "") // Variation Selectors
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, "") // Supplemental Symbols
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "") // Chess symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "") // Symbols and Pictographs Extended-A
      .replace(/[\u{231A}-\u{231B}]/gu, "") // Watch, Hourglass
      .replace(/[\u{23E9}-\u{23F3}]/gu, "") // Media control symbols
      .replace(/[\u{23F8}-\u{23FA}]/gu, "") // Media control symbols
      .replace(/[\u{25AA}-\u{25AB}]/gu, "") // Geometric shapes
      .replace(/[\u{25B6}]/gu, "") // Play button
      .replace(/[\u{25C0}]/gu, "") // Reverse button
      .replace(/[\u{25FB}-\u{25FE}]/gu, "") // Square symbols
      .replace(/[\u{2614}-\u{2615}]/gu, "") // Umbrella, Hot beverage
      .replace(/[\u{2648}-\u{2653}]/gu, "") // Zodiac signs
      .replace(/[\u{267F}]/gu, "") // Wheelchair
      .replace(/[\u{2693}]/gu, "") // Anchor
      .replace(/[\u{26A1}]/gu, "") // High voltage
      .replace(/[\u{26AA}-\u{26AB}]/gu, "") // Circles
      .replace(/[\u{26BD}-\u{26BE}]/gu, "") // Soccer, Baseball
      .replace(/[\u{26C4}-\u{26C5}]/gu, "") // Snowman, Sun
      .replace(/[\u{26CE}]/gu, "") // Ophiuchus
      .replace(/[\u{26D4}]/gu, "") // No entry
      .replace(/[\u{26EA}]/gu, "") // Church
      .replace(/[\u{26F2}-\u{26F3}]/gu, "") // Fountain, Golf
      .replace(/[\u{26F5}]/gu, "") // Sailboat
      .replace(/[\u{26FA}]/gu, "") // Tent
      .replace(/[\u{26FD}]/gu, "") // Fuel pump
      .replace(/[\u{2702}]/gu, "") // Scissors
      .replace(/[\u{2705}]/gu, "") // Check mark
      .replace(/[\u{2708}-\u{270D}]/gu, "") // Airplane to Writing hand
      .replace(/[\u{270F}]/gu, "") // Pencil
      .replace(/[\u{2712}]/gu, "") // Black nib
      .replace(/[\u{2714}]/gu, "") // Check mark
      .replace(/[\u{2716}]/gu, "") // X mark
      .replace(/[\u{271D}]/gu, "") // Latin cross
      .replace(/[\u{2721}]/gu, "") // Star of David
      .replace(/[\u{2728}]/gu, "") // Sparkles
      .replace(/[\u{2733}-\u{2734}]/gu, "") // Eight spoked asterisk
      .replace(/[\u{2744}]/gu, "") // Snowflake
      .replace(/[\u{2747}]/gu, "") // Sparkle
      .replace(/[\u{274C}]/gu, "") // Cross mark
      .replace(/[\u{274E}]/gu, "") // Cross mark
      .replace(/[\u{2753}-\u{2755}]/gu, "") // Question marks
      .replace(/[\u{2757}]/gu, "") // Exclamation mark
      .replace(/[\u{2763}-\u{2764}]/gu, "") // Heart exclamation
      .replace(/[\u{2795}-\u{2797}]/gu, "") // Plus, Minus, Division
      .replace(/[\u{27A1}]/gu, "") // Right arrow
      .replace(/[\u{27B0}]/gu, "") // Curly loop
      .replace(/[\u{27BF}]/gu, "") // Double curly loop
      .replace(/[\u{2934}-\u{2935}]/gu, "") // Arrows
      .replace(/[\u{2B05}-\u{2B07}]/gu, "") // Arrows
      .replace(/[\u{2B1B}-\u{2B1C}]/gu, "") // Squares
      .replace(/[\u{2B50}]/gu, "") // Star
      .replace(/[\u{2B55}]/gu, "") // Circle
      .replace(/[\u{3030}]/gu, "") // Wavy dash
      .replace(/[\u{303D}]/gu, "") // Part alternation mark
      .replace(/[\u{3297}]/gu, "") // Circled ideograph congratulation
      .replace(/[\u{3299}]/gu, "") // Circled ideograph secret
      .replace(/[^\w\s.\-_()[\]]/g, "") // Remove remaining non-word chars except common ones
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_+/g, "_") // Remove duplicate underscores
      .trim();
  };

  const handleUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}`;

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

      const message = error instanceof Error ? error.message : "Tente novamente";
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });

      // Let the uploader UI mark this file as failed
      throw new Error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocessPending = async () => {
    const docsToReprocess = documents.filter(
      (d) => d.status === "pending" || d.status === "processing",
    );

    if (docsToReprocess.length === 0) return;

    setIsReprocessing(true);
    try {
      docsToReprocess.forEach((doc) => {
        supabase.functions
          .invoke("process-ia-document", {
            body: { filePath: doc.file_path },
          })
          .catch((err) => console.error("Reprocess error:", err));
      });

      toast({
        title: "Reprocessamento iniciado",
        description: `Iniciamos o processamento de ${docsToReprocess.length} documento(s).`,
      });
    } finally {
      setIsReprocessing(false);
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
              Gerencie os documentos que a IA W3 consulta para respostas personalizadas.
              <span className="block text-sm text-primary">Estes documentos são compartilhados com todos os usuários.</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {documents.some((d) => d.status === "pending" || d.status === "processing") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocessPending}
              disabled={isReprocessing}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reprocessar pendentes
            </Button>
          )}

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
