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
import { Loader2, Plus, Trash2, Send, Pencil, Check, X, Calendar, Star } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
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

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  authorName?: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
  authorName?: string;
}

interface ActionDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  canEditTask?: boolean;
}

export function ActionDrawer({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onTaskUpdate,
  onTaskDelete,
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

  // Inline editing state (staff only)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task || !open) return;
    setChecklist(task.checklist || []);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditingField(null);
    fetchComments();
    fetchActivity();
  }, [task?.id, open]);

  // Resolve profile names from a list of user_ids
  const resolveNames = async (userIds: string[]): Promise<Record<string, string>> => {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0) return {};
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", unique);
    const map: Record<string, string> = {};
    (data || []).forEach((p: any) => {
      map[p.user_id] = p.full_name || p.email || "Usuário";
    });
    return map;
  };

  const fetchComments = async () => {
    if (!task) return;
    setLoadingComments(true);
    const { data } = await (supabase as any)
      .from("action_comments")
      .select("id, user_id, content, created_at")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    const rows = data || [];
    const names = await resolveNames(rows.map((r: any) => r.user_id));
    setComments(rows.map((r: any) => ({ ...r, authorName: names[r.user_id] || "Usuário" })));
    setLoadingComments(false);
  };

  const fetchActivity = async () => {
    if (!task) return;
    const { data } = await (supabase as any)
      .from("action_activity_log")
      .select("id, user_id, event, payload, created_at")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    const rows = data || [];
    const names = await resolveNames(rows.map((r: any) => r.user_id));
    setActivityLog(rows.map((r: any) => ({ ...r, authorName: names[r.user_id] || "Usuário" })));
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    onStatusChange(task.id, status);
    await (supabase as any).from("action_activity_log").insert({
      task_id: task.id,
      user_id: user?.id,
      event: "status_changed",
      payload: { from: task.status, to: status },
    });
    fetchActivity();
  };

  const handleChecklistToggle = async (itemId: string) => {
    if (!task) return;
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);

    const allChecked = updated.length > 0 && updated.every(i => i.checked);

    await (supabase as any)
      .from("tarefas")
      .update({ checklist: updated, ...(allChecked ? { status: "concluida" } : {}) })
      .eq("id", task.id);

    onTaskUpdate?.(task.id, { checklist: updated, ...(allChecked ? { status: "concluida" } : {}) });

    if (allChecked && task.status !== "concluida") {
      onStatusChange(task.id, "concluida");
      toast({ title: "Ação concluída!", description: "Todos os itens do checklist foram marcados." });
    }
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

  const handleSaveField = async (field: "title" | "description") => {
    if (!task) return;
    const value = field === "title" ? editTitle.trim() : editDescription.trim();
    if (field === "title" && !value) return;
    setSavingEdit(true);
    const update = { [field]: value || null };
    await (supabase as any).from("tarefas").update(update).eq("id", task.id);
    setSavingEdit(false);
    onTaskUpdate?.(task.id, update);
    setEditingField(null);
  };

  const handleSavePriority = async (priority: string) => {
    if (!task) return;
    await (supabase as any).from("tarefas").update({ priority }).eq("id", task.id);
    onTaskUpdate?.(task.id, { priority: priority as Task["priority"] });
  };

  const handleSaveDate = async (field: "start_date" | "due_date", date: Date | undefined) => {
    if (!task) return;
    const value = date ? format(date, "yyyy-MM-dd") : null;
    await (supabase as any).from("tarefas").update({ [field]: value }).eq("id", task.id);
    onTaskUpdate?.(task.id, { [field]: value });
  };

  const handleSaveSprint = async (sprintStr: string) => {
    if (!task) return;
    const sprint = sprintStr === "" || sprintStr === "none" ? null : parseInt(sprintStr, 10);
    await (supabase as any).from("tarefas").update({ sprint }).eq("id", task.id);
    onTaskUpdate?.(task.id, { sprint });
  };

  const handleToggleNextAction = async () => {
    if (!task) return;
    const newValue = !task.is_next_action;
    if (newValue) {
      // Clear is_next_action from other tasks of same user
      await (supabase as any).from("tarefas")
        .update({ is_next_action: false })
        .eq("user_id", task.user_id)
        .eq("is_next_action", true)
        .neq("id", task.id);
    }
    await (supabase as any).from("tarefas").update({ is_next_action: newValue }).eq("id", task.id);
    onTaskUpdate?.(task.id, { is_next_action: newValue });
    toast({ title: newValue ? "Definida como próxima ação" : "Removida como próxima ação" });
  };

  const handleDelete = async () => {
    if (!task || !onTaskDelete) return;
    await (supabase as any).from("tarefas").delete().eq("id", task.id);
    onTaskDelete(task.id);
    onOpenChange(false);
    toast({ title: "Ação removida" });
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
      toast({ title: "Erro ao enviar comentário", description: error.message, variant: "destructive" });
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await (supabase as any).from("action_comments").delete().eq("id", commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  const renderActivityItem = (log: ActivityLog) => {
    const name = log.authorName || "Usuário";
    switch (log.event) {
      case "created": return `${name} criou esta ação`;
      case "status_changed": return `${name} mudou status: ${log.payload.from} → ${log.payload.to}`;
      case "commented": return `${name} comentou`;
      default: return `${name}: ${log.event}`;
    }
  };

  if (!task) return null;

  const checkedCount = checklist.filter(i => i.checked).length;
  const checklistProgress = checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0;

  const currentTitle = editingField === "title" ? editTitle : task.title;
  const currentDescription = editingField === "description" ? editDescription : (task.description || "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          {/* Title */}
          {editingField === "title" ? (
            <div className="flex gap-2 items-start pr-8">
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveField("title")}
                autoFocus
                className="text-sm font-semibold"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleSaveField("title")} disabled={savingEdit}>
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingField(null)}>
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2 pr-8 group">
              <SheetTitle className="text-base leading-snug flex-1">{task.title}</SheetTitle>
              {isStaff && (
                <button onClick={() => setEditingField("title")} className="opacity-0 group-hover:opacity-100 mt-0.5 text-muted-foreground hover:text-foreground transition-opacity shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {task.section && <p className="text-xs text-muted-foreground">{task.section}</p>}
        </SheetHeader>

        <div className="space-y-5">
          {/* Description */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs font-medium text-muted-foreground">Descrição</p>
              {isStaff && editingField !== "description" && (
                <button onClick={() => setEditingField("description")} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {editingField === "description" ? (
              <div className="space-y-2">
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  autoFocus
                  className="text-sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSaveField("description")} disabled={savingEdit}>
                    <Check className="h-3.5 w-3.5 text-green-600 mr-1" />Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingField(null)}>
                    <X className="h-3.5 w-3.5 text-destructive mr-1" />Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description || <span className="italic">Sem descrição</span>}
              </p>
            )}
          </div>

          {/* Status */}
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

          {/* Priority + Dates (editable for staff) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              {isStaff ? (
                <Select value={task.priority || ""} onValueChange={handleSavePriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa" className="text-xs">Baixa</SelectItem>
                    <SelectItem value="Média" className="text-xs">Média</SelectItem>
                    <SelectItem value="Alta" className="text-xs">Alta</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">
                  {task.priority ? <Badge variant="outline" className="text-xs">{task.priority}</Badge> : <span className="text-muted-foreground">—</span>}
                </p>
              )}
            </div>

            <div /> {/* spacer */}

            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              {isStaff ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-xs w-full justify-start font-normal">
                      <Calendar className="h-3 w-3 mr-1.5" />
                      {task.start_date
                        ? new Date(task.start_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : <span className="text-muted-foreground">Definir</span>
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={task.start_date ? parseISO(task.start_date) : undefined}
                      onSelect={d => handleSaveDate("start_date", d)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-sm">{task.start_date ? new Date(task.start_date + "T00:00:00").toLocaleDateString("pt-BR") : <span className="text-muted-foreground">—</span>}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Prazo</Label>
              {isStaff ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-xs w-full justify-start font-normal">
                      <Calendar className="h-3 w-3 mr-1.5" />
                      {task.due_date
                        ? new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : <span className="text-muted-foreground">Definir</span>
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={task.due_date ? parseISO(task.due_date) : undefined}
                      onSelect={d => handleSaveDate("due_date", d)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-sm">{task.due_date ? new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR") : <span className="text-muted-foreground">—</span>}</p>
              )}
            </div>
          </div>

          {/* Sprint + Next action (staff only) */}
          {isStaff && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sprint</Label>
                <Select
                  value={task.sprint !== null && task.sprint !== undefined ? String(task.sprint) : "none"}
                  onValueChange={handleSaveSprint}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sem sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Sem sprint</SelectItem>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <SelectItem key={n} value={String(n)} className="text-xs">Sprint {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destaque</Label>
                <button
                  onClick={handleToggleNextAction}
                  className={`flex items-center gap-2 h-8 px-3 rounded-md border text-xs w-full transition-colors ${
                    task.is_next_action
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                      : "border-input bg-transparent text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${task.is_next_action ? "fill-amber-500 text-amber-500" : ""}`} />
                  {task.is_next_action ? "Próxima ação" : "Definir como próxima"}
                </button>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Checklist {checklist.length > 0 && `(${checkedCount}/${checklist.length})`}
              </p>
            </div>
            {checklist.length > 0 && (
              <>
                <div className="h-1.5 w-full rounded-full bg-muted mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${checklistProgress === 100 ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
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
              </>
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
                      <span className="text-xs font-medium">{c.authorName}</span>
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

          {/* Delete (staff only) */}
          {isStaff && onTaskDelete && (
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Remover ação
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
