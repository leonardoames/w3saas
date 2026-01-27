export type PlanType = 'global' | 'individual' | 'admin_personalizado';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ActionPlan {
  id: string;
  title: string;
  description: string | null;
  plan_type: PlanType;
  created_by: string;
  target_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Campos computados (opcional)
  can_edit?: boolean;
  creator_name?: string;
  target_user_name?: string;
}

export interface ActionTask {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  task_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanData {
  title: string;
  description?: string;
  plan_type: PlanType;
  target_user_id?: string;
}

export interface CreateTaskData {
  plan_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
}

export interface UpdateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  status?: TaskStatus;
}
