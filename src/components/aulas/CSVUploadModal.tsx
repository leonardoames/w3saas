import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PANDA_EMBED_BASE = "https://player-vz-75e71015-90c.tv.pandavideo.com.br/embed/?v=";

function normalizePandaEmbed(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("<")) {
    const match = raw.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const extracted = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
    if (extracted) return extracted;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const videoId = (uuidMatch?.[0] ?? raw).trim();
  return `${PANDA_EMBED_BASE}${encodeURIComponent(videoId)}`;
}

interface ParsedRow {
  modulo: string;
  aula: string;
  panda_video_url: string;
  descricao: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const firstLower = lines[0].toLowerCase();
  const hasHeader = firstLower.includes("modulo") || firstLower.includes("módulo") || firstLower.includes("aula");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      return {
        modulo: cols[0] || "",
        aula: cols[1] || "",
        panda_video_url: cols[2] || "",
        descricao: cols[3] || "",
      };
    })
    .filter((r) => r.modulo && r.aula);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSuccess: () => void;
}

export function CSVUploadModal({ isOpen, onClose, courseId, onSuccess }: Props) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(parseCSV(text));
    };
    reader.readAsText(file, "utf-8");
  };

  const handleTextChange = (val: string) => {
    setCsvText(val);
    setParsed(parseCSV(val));
  };

  const handleImport = async () => {
    if (parsed.length === 0 || !courseId) return;
    setImporting(true);
    setProgress(0);

    try {
      // Cache module id by name
      const moduleCache: Record<string, string> = {};

      const getOrCreateModule = async (name: string): Promise<string> => {
        const key = name.toLowerCase();
        if (moduleCache[key]) return moduleCache[key];

        // Check if exists
        const { data: existing } = await (supabase as any)
          .from("course_modules")
          .select("id")
          .eq("course_id", courseId)
          .ilike("title", name)
          .maybeSingle();

        if (existing?.id) {
          moduleCache[key] = existing.id;
          return existing.id;
        }

        // Get max order
        const { data: maxRow } = await (supabase as any)
          .from("course_modules")
          .select("order")
          .eq("course_id", courseId)
          .order("order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (maxRow?.order ?? 0) + 1;

        const { data: created, error } = await (supabase as any)
          .from("course_modules")
          .insert({ course_id: courseId, title: name, order: nextOrder })
          .select("id")
          .single();

        if (error) throw error;
        moduleCache[key] = created.id;
        return created.id;
      };

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const moduleId = await getOrCreateModule(row.modulo);

        // Get max lesson order in module
        const { data: maxLessonRow } = await (supabase as any)
          .from("lessons")
          .select("order")
          .eq("module_id", moduleId)
          .order("order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lessonOrder = (maxLessonRow?.order ?? 0) + 1;
        const pandaId = normalizePandaEmbed(row.panda_video_url);

        await (supabase as any).from("lessons").insert({
          module_id: moduleId,
          title: row.aula,
          panda_video_id: pandaId,
          description: row.descricao || null,
          order: lessonOrder,
        });

        setProgress(Math.round(((i + 1) / parsed.length) * 100));
      }

      toast({ title: `✅ ${parsed.length} aulas importadas com sucesso!` });
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setCsvText("");
    setParsed([]);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Aulas via CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Upload area */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Formato: <code className="text-xs bg-muted px-1 rounded">modulo,aula,panda_video_url,descricao</code>
              &nbsp;— separador <code className="text-xs bg-muted px-1 rounded">,</code> ou <code className="text-xs bg-muted px-1 rounded">;</code>
            </p>
            <div className="flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Escolher arquivo
              </Button>
              <span className="text-sm text-muted-foreground">ou cole abaixo</span>
            </div>
            <Textarea
              placeholder={"Módulo A,Aula 1,https://...,Descrição\nMódulo A,Aula 2,uuid,..."}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={5}
              className="font-mono text-xs"
              disabled={importing}
            />
          </div>

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{parsed.length} aulas encontradas</p>
              <div className="border rounded-md overflow-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Módulo</th>
                      <th className="px-3 py-2 text-left font-medium">Aula</th>
                      <th className="px-3 py-2 text-left font-medium">URL/ID</th>
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{row.modulo}</td>
                        <td className="px-3 py-1.5">{row.aula}</td>
                        <td className="px-3 py-1.5 max-w-[160px] truncate text-muted-foreground">{row.panda_video_url}</td>
                        <td className="px-3 py-1.5 max-w-[140px] truncate text-muted-foreground">{row.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={parsed.length === 0 || importing}>
            {importing ? "Importando..." : `Importar ${parsed.length} aulas`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
