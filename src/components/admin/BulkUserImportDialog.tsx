import { useState } from "react";
import { FileUp, FileSpreadsheet, Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface BulkUserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserToImport {
  email: string;
  name?: string;
  plan?: string;
  is_mentorado?: boolean;
  is_w3_client?: boolean;
}

interface ImportResult {
  email: string;
  status: "success" | "error";
  message: string;
}

export function BulkUserImportDialog({ open, onOpenChange, onSuccess }: BulkUserImportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"paste" | "file">("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [defaultPlan, setDefaultPlan] = useState("manual");
  const [defaultMentorado, setDefaultMentorado] = useState(false);
  const [defaultW3Client, setDefaultW3Client] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const parseCSVContent = (content: string): UserToImport[] => {
    const lines = content.trim().split("\n");
    const users: UserToImport[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header if present
      if (i === 0 && (line.toLowerCase().includes("email") || line.toLowerCase().includes("nome"))) {
        continue;
      }

      // Try to parse as CSV
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
      
      if (parts[0] && parts[0].includes("@")) {
        users.push({
          email: parts[0].toLowerCase(),
          name: parts[1] || undefined,
          plan: parts[2] || defaultPlan,
          is_mentorado: parts[3]?.toLowerCase() === "sim" || parts[3]?.toLowerCase() === "true" || defaultMentorado,
          is_w3_client: parts[4]?.toLowerCase() === "sim" || parts[4]?.toLowerCase() === "true" || defaultW3Client,
        });
      }
    }

    return users;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv" || extension === "txt") {
        const text = await file.text();
        setPasteContent(text);
      } else if (extension === "xlsx" || extension === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        setPasteContent(csvContent);
      } else {
        toast({
          title: "Formato não suportado",
          description: "Use arquivos CSV, TXT ou Excel (XLSX/XLS).",
          variant: "destructive",
        });
        return;
      }

      setActiveTab("paste");
      toast({
        title: "Arquivo carregado",
        description: "Verifique os dados antes de importar.",
      });
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível processar o arquivo.",
        variant: "destructive",
      });
    }

    // Reset input
    e.target.value = "";
  };

  const handleImport = async () => {
    const users = parseCSVContent(pasteContent);

    if (users.length === 0) {
      toast({
        title: "Nenhum usuário encontrado",
        description: "Verifique se o formato dos dados está correto.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setResults([]);
    const importResults: ImportResult[] = [];

    for (const user of users) {
      try {
        // Send password reset email as invitation
        const { error: inviteError } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (inviteError) {
          importResults.push({
            email: user.email,
            status: "error",
            message: inviteError.message,
          });
        } else {
          importResults.push({
            email: user.email,
            status: "success",
            message: "Convite enviado com sucesso",
          });
        }
      } catch (error: any) {
        importResults.push({
          email: user.email,
          status: "error",
          message: error.message || "Erro desconhecido",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setResults(importResults);
    setShowResults(true);
    setImporting(false);

    const successCount = importResults.filter((r) => r.status === "success").length;
    const errorCount = importResults.filter((r) => r.status === "error").length;

    toast({
      title: "Importação concluída",
      description: `${successCount} convites enviados, ${errorCount} erros.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = "email,nome,plano,mentorado,cliente_w3\nexemplo@email.com,Nome do Usuário,manual,nao,nao\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_usuarios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (!importing) {
      setPasteContent("");
      setResults([]);
      setShowResults(false);
      onOpenChange(false);
    }
  };

  const parsedUsers = parseCSVContent(pasteContent);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Usuários em Massa</DialogTitle>
          <DialogDescription>
            Adicione múltiplos usuários de uma vez. Cada usuário receberá um email para criar sua senha.
          </DialogDescription>
        </DialogHeader>

        {showResults ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Resultados da Importação</h3>
              <div className="flex gap-2 text-sm">
                <span className="text-green-600">
                  ✓ {results.filter((r) => r.status === "success").length} sucesso
                </span>
                <span className="text-destructive">
                  ✗ {results.filter((r) => r.status === "error").length} erros
                </span>
              </div>
            </div>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 ${
                    result.status === "error" ? "bg-destructive/10" : "bg-primary/5"
                  }`}
                >
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="font-mono text-sm truncate">{result.email}</span>
                  <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">
                    {result.message}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setShowResults(false);
                  setPasteContent("");
                }}
              >
                Importar Mais
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "paste" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Colar Dados</TabsTrigger>
                <TabsTrigger value="file">Importar Arquivo</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-2">
                  <Label>Lista de Emails (um por linha ou separados por vírgula)</Label>
                  <Textarea
                    placeholder="email1@exemplo.com,Nome do Usuário&#10;email2@exemplo.com,Outro Nome&#10;email3@exemplo.com"
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: email, nome (opcional), plano (opcional), mentorado (sim/nao), cliente_w3 (sim/nao)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Label htmlFor="bulk-file-upload" className="cursor-pointer block">
                    <div className="flex justify-center gap-2 mb-4">
                      <FileUp className="h-10 w-10 text-muted-foreground" />
                      <FileSpreadsheet className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Clique para selecionar arquivo CSV ou Excel
                    </p>
                    <p className="text-xs text-muted-foreground">Formatos suportados: CSV, TXT, XLSX, XLS</p>
                  </Label>
                  <Input
                    id="bulk-file-upload"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar Template CSV
                </Button>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Plano Padrão</Label>
                <Select value={defaultPlan} onValueChange={setDefaultPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="default-mentorado"
                  checked={defaultMentorado}
                  onChange={(e) => setDefaultMentorado(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="default-mentorado" className="text-sm">
                  Mentorado
                </Label>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="default-w3"
                  checked={defaultW3Client}
                  onChange={(e) => setDefaultW3Client(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="default-w3" className="text-sm">
                  Cliente W3
                </Label>
              </div>
            </div>

            {parsedUsers.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Prévia ({parsedUsers.length} usuários)</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parsedUsers.slice(0, 10).map((user, i) => (
                    <div key={i} className="text-sm font-mono flex gap-2">
                      <span className="text-primary">{user.email}</span>
                      {user.name && <span className="text-muted-foreground">- {user.name}</span>}
                    </div>
                  ))}
                  {parsedUsers.length > 10 && (
                    <p className="text-xs text-muted-foreground">... e mais {parsedUsers.length - 10} usuários</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || parsedUsers.length === 0}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${parsedUsers.length} Usuários`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
