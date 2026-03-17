import { useState, useEffect, useRef } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, TaskStatus, ChecklistItem } from "@/hooks/useTasks";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "a_fazer", label: "A Fazer" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const PRIORITY_OPTIONS = ["Baixa", "Média", "Alta"] as const;

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface ActivityLog {
  id: string;
  user_id: string;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface ActionDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  canEditTask?: boolean;
}

export function ActionDrawer({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onTaskUpdate,
  canEditTask = false,
}: ActionDrawerProps) {
  const { user, isAdmin, hasRole } = useAuth();
  const isStaff = isAdmin || hasRole("master") || hasRole("tutor") || hasRole("cs");
  const { toast } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [savingChecklist, setSavingChecklist] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task || !open) return;
    setChecklist(task.checklist || []);
    fetchComments();
    fetchActivity();
  }, [task?.id, open]);

  const fetchComments = async () => {
    if (!task) return;
    setLoadingComments(true);
    const { data } = await (supabase as any)
      .from("action_comments")
      .select("id, user_id, content, created_at, profiles(full_name, email)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
    setLoadingComments(false);
  };

  const fetchActivity = async () => {
    if (!task) return;
    const { data } = await (supabase as any)
      .from("action_activity_log")
      .select("id, user_id, event, payload, created_at, profiles(full_name, email)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setActivityLog(data || []);
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    onStatusChange(task.id, status);
    // Log activity
    await (supabase as any).from("action_activity_log").insert({
      task_id: task.id,
      user_id: user?.id,
      event: "status_changed",
      payload: { from: task.status, to: status },
    });
    fetchActivity();
  };

  const handleChecklistToggle = async (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    await (supabase as any)
      .from("tarefas")
      .update({ checklist: updated })
      .eq("id", task?.id);
    onTaskUpdate?.(task!.id, { checklist: updated });
  };

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim() || !task) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newCheckItem.trim(),
      checked: false,
    };
    const updated = [...checklist, newItem];
    setSavingChecklist(true);
    await (supabase as any).from("tarefas").update({ checklist: updated }).eq("id", task.id);
    setSavingChecklist(false);
    setChecklist(updated);
    setNewCheckItem("");
    onTaskUpdate?.(task.id, { checklist: updated });
  };

  const handleRemoveCheckItem = async (itemId: string) => {
    if (!task) return;
    const updated = checklist.filter(i => i.id !== itemId);
    await (supabase as any).from("tarefas").update({ checklist: updated }).eq("id", task.id);
    setChecklist(updated);
    onTaskUpdate?.(task.id, { checklist: updated });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !task || !user) return;
    setSubmittingComment(true);
    const { error } = await (supabase as any).from("action_comments").insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (!error) {
      // Log activity
      await (supabase as any).from("action_activity_log").insert({
        task_id: task.id,
        user_id: user.id,
        event: "commented",
        payload: {},
      });
      setNewComment("");
      fetchComments();
      fetchActivity();
    } else {
      toast({ title: "Erro ao enviar comentário", variant: "destructive" });
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await (supabase as any)
      .from("action_comments")
      .delete()
      .eq("id", commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const getDisplayName = (obj?: { full_name?: string | null; email?: string | null } | null) =>
    obj?.full_name || obj?.email || "Usuário";

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    return `${days}d atrás`;
  };

  const renderActivityItem = (log: ActivityLog) => {
    const name = getDisplayName(log.profiles);
    switch (log.event) {
      case "created": return `${name} criou esta ação`;
      case "status_changed": return `${name} mudou status: ${log.payload.from} → ${log.payload.to}`;
      case "commented": return `${name} comentou`;
      default: return `${name}: ${log.event}`;
    }
  };

  if (!task) return null;

  const checkedCount = checklist.filter(i => i.checked).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base leading-snug pr-8">{task.title}</SheetTitle>
          {task.section && (
            <p className="text-xs text-muted-foreground">{task.section}</p>
          )}
        </SheetHeader>

        <div className="space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Status + Priority + Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={task.status} onValueChange={v => handleStatusChange(v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <div className="flex gap-1 flex-wrap">
                {task.priority ? (
                  <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {task.start_date && (
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="text-sm">
                  {new Date(task.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}

            {task.due_date && (
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="text-sm">
                  {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Checklist {checklist.length > 0 && `(${checkedCount}/${checklist.length})`}
              </p>
            </div>
            {checklist.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleChecklistToggle(item.id)}
                      id={`check-${item.id}`}
                    />
                    <label
                      htmlFor={`check-${item.id}`}
                      className={`flex-1 text-sm cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                    >
                      {item.text}
                    </label>
                    {isStaff && (
                      <button
                        onClick={() => handleRemoveCheckItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isStaff && (
              <div className="flex gap-2">
                <Input
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddCheckItem()}
                  placeholder="Novo item..."
                  className="h-7 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={handleAddCheckItem}
                  disabled={savingChecklist || !newCheckItem.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Comentários</p>
            {loadingComments ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-2 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-muted/40 rounded-md p-2.5 group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{getDisplayName(c.profiles)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(c.created_at)}</span>
                        {(c.user_id === user?.id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum comentário ainda</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSubmitComment()}
                placeholder="Escreva um comentário..."
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                className="h-8 px-2"
                onClick={handleSubmitComment}
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Activity Log */}
          {activityLog.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Histórico</p>
              <div className="space-y-1">
                {activityLog.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 text-[10px] mt-0.5">{formatRelativeTime(log.created_at)}</span>
                    <span>{renderActivityItem(log)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
