import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'concluida' | 'cancelada';
export type TaskOrigin = 'sistema' | 'admin' | 'mentorado';

export interface Task {
  id: string;
  user_id: string;
  section: string;
  title: string;
  description: string | null;
  priority: 'Baixa' | 'Média' | 'Alta' | null;
  due_date: string | null;
  status: TaskStatus;
  origin: TaskOrigin;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const SECTIONS = [
  'Fundação & Estrutura',
  'Logística & Operação',
  'ERP & Integrações',
  'Financeiro',
  'Contábil & Fiscal',
  'Marketing & Oferta',
  'Canais de Aquisição',
  'Tráfego Pago',
  'Marketplaces',
  'Escala & Otimização',
] as const;

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const targetUserId = userId || user?.id;

  const fetchTasks = useCallback(async () => {
    if (!targetUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('user_id', targetUserId)
        .order('section')
        .order('order_index');

      if (error) throw error;

      // Map database types to our TypeScript types
      const mappedTasks: Task[] = (data || []).map(task => ({
        ...task,
        status: task.status as TaskStatus,
        origin: task.origin as TaskOrigin,
        priority: task.priority as 'Baixa' | 'Média' | 'Alta' | null,
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Erro ao carregar tarefas",
        description: "Não foi possível carregar o plano de ação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [targetUserId, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));

      const statusLabels: Record<TaskStatus, string> = {
        a_fazer: 'A Fazer',
        em_andamento: 'Em Andamento',
        concluida: 'Concluída',
        cancelada: 'Cancelada',
      };

      toast({
        title: "Status atualizado",
        description: `Tarefa marcada como "${statusLabels[status]}"`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const updateTaskDueDate = async (taskId: string, dueDate: string | null) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ due_date: dueDate })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: dueDate } : t));

      toast({
        title: "Data atualizada",
        description: dueDate ? "Prazo definido com sucesso." : "Prazo removido.",
      });
    } catch (error) {
      console.error('Error updating task due date:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a data.",
        variant: "destructive",
      });
    }
  };

  const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .insert(task)
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        ...data,
        status: data.status as TaskStatus,
        origin: data.origin as TaskOrigin,
        priority: data.priority as 'Baixa' | 'Média' | 'Alta' | null,
      };

      setTasks(prev => [...prev, newTask]);

      toast({
        title: "Tarefa criada",
        description: "Nova ação adicionada ao plano.",
      });

      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

      toast({
        title: "Tarefa atualizada",
        description: "Alterações salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));

      toast({
        title: "Tarefa removida",
        description: "A ação foi excluída do plano.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
        variant: "destructive",
      });
    }
  };

  const reorderTasks = async (section: string, orderedIds: string[]) => {
    try {
      // Update locally first for instant feedback
      setTasks(prev => {
        const sectionTasks = prev.filter(t => t.section === section);
        const otherTasks = prev.filter(t => t.section !== section);
        
        const reorderedSection = orderedIds.map((id, index) => {
          const task = sectionTasks.find(t => t.id === id);
          return task ? { ...task, order_index: index } : null;
        }).filter(Boolean) as Task[];
        
        return [...otherTasks, ...reorderedSection];
      });

      // Update in database
      const updates = orderedIds.map((id, index) => 
        supabase.from('tarefas').update({ order_index: index }).eq('id', id)
      );
      
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ordem.",
        variant: "destructive",
      });
      fetchTasks(); // Revert to database state
    }
  };

  // Compute progress
  const nonCanceledTasks = tasks.filter(t => t.status !== 'cancelada');
  const completedTasks = tasks.filter(t => t.status === 'concluida');
  const progress = nonCanceledTasks.length > 0 
    ? (completedTasks.length / nonCanceledTasks.length) * 100 
    : 0;

  return {
    tasks,
    loading,
    progress,
    completedCount: completedTasks.length,
    totalCount: nonCanceledTasks.length,
    updateTaskStatus,
    updateTaskDueDate,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    refetch: fetchTasks,
    isAdmin,
  };
}
