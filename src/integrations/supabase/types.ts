export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          target_user_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          target_user_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          target_user_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      action_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          plan_id: string
          priority: string | null
          status: string | null
          task_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          plan_id: string
          priority?: string | null
          status?: string | null
          task_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          plan_id?: string
          priority?: string | null
          status?: string | null
          task_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          logo_url: string | null
          long_description: string | null
          name: string
          rejected_reason: string | null
          short_description: string
          status: string
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          long_description?: string | null
          name: string
          rejected_reason?: string | null
          short_description: string
          status?: string
          updated_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          long_description?: string | null
          name?: string
          rejected_reason?: string | null
          short_description?: string
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          title?: string
        }
        Relationships: []
      }
      ia_documents: {
        Row: {
          content_text: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_text?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      influenciador_contacts: {
        Row: {
          created_at: string
          id: string
          influenciador_id: string
          telefone_encrypted: string
          telefone_masked: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          influenciador_id: string
          telefone_encrypted: string
          telefone_masked: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          influenciador_id?: string
          telefone_encrypted?: string
          telefone_masked?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influenciador_contacts_influenciador_id_fkey"
            columns: ["influenciador_id"]
            isOneToOne: true
            referencedRelation: "influenciadores"
            referencedColumns: ["id"]
          },
        ]
      }
      influenciadores: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          social_handle: string | null
          stage: string
          stage_order: number
          status: string
          tags: string[] | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          social_handle?: string | null
          stage?: string
          stage_order?: number
          status?: string
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          social_handle?: string | null
          stage?: string
          stage_order?: number
          status?: string
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          lesson_id: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          module_id: string | null
          order: number
          panda_video_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          module_id?: string | null
          order: number
          panda_video_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          module_id?: string | null
          order?: number
          panda_video_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_diarias: {
        Row: {
          created_at: string
          data: string
          faturamento: number | null
          id: string
          investimento_trafego: number | null
          platform: string | null
          sessoes: number | null
          updated_at: string
          user_id: string
          vendas_quantidade: number | null
          vendas_valor: number | null
        }
        Insert: {
          created_at?: string
          data: string
          faturamento?: number | null
          id?: string
          investimento_trafego?: number | null
          platform?: string | null
          sessoes?: number | null
          updated_at?: string
          user_id: string
          vendas_quantidade?: number | null
          vendas_valor?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          faturamento?: number | null
          id?: string
          investimento_trafego?: number | null
          platform?: string | null
          sessoes?: number | null
          updated_at?: string
          user_id?: string
          vendas_quantidade?: number | null
          vendas_valor?: number | null
        }
        Relationships: []
      }
      module_access: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_name: string
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_name: string
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_name?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          access_status: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_mentorado: boolean
          is_w3_client: boolean
          last_login_at: string | null
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_mentorado?: boolean
          is_w3_client?: boolean
          last_login_at?: string | null
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_mentorado?: boolean
          is_w3_client?: boolean
          last_login_at?: string | null
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          origin: Database["public"]["Enums"]["task_origin"]
          priority: string | null
          section: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          origin?: Database["public"]["Enums"]["task_origin"]
          priority?: string | null
          section: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          origin?: Database["public"]["Enums"]["task_origin"]
          priority?: string | null
          section?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_calendar_events: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          nome: string
          notas: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          nome: string
          notas?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nome?: string
          notas?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      brands_public: {
        Row: {
          approval_status: string | null
          category: string | null
          created_at: string | null
          facebook_url: string | null
          id: string | null
          instagram_url: string | null
          is_active: boolean | null
          logo_url: string | null
          long_description: string | null
          name: string | null
          short_description: string | null
          status: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          approval_status?: string | null
          category?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          long_description?: string | null
          name?: string | null
          short_description?: string | null
          status?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          approval_status?: string | null
          category?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          long_description?: string | null
          name?: string | null
          short_description?: string | null
          status?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_set_expiration: {
        Args: { expiration_date: string; target_user_id: string }
        Returns: undefined
      }
      admin_update_role: {
        Args: { make_admin: boolean; target_user_id: string }
        Returns: undefined
      }
      admin_update_user_flag: {
        Args: { flag_name: string; flag_value: boolean; target_user_id: string }
        Returns: undefined
      }
      admin_update_user_name: {
        Args: { new_name: string; target_user_id: string }
        Returns: undefined
      }
      admin_update_user_plan: {
        Args: { new_plan: string; target_user_id: string }
        Returns: undefined
      }
      admin_update_user_status: {
        Args: { new_status: string; target_user_id: string }
        Returns: undefined
      }
      approve_brand: { Args: { p_brand_id: string }; Returns: undefined }
      can_create_plan: {
        Args: { p_plan_type: string; p_target_user_id?: string }
        Returns: boolean
      }
      can_edit_plan: { Args: { p_plan_id: string }; Returns: boolean }
      can_user_add_brand: { Args: { check_user_id: string }; Returns: boolean }
      can_view_plan: { Args: { p_plan_id: string }; Returns: boolean }
      create_action_plan: {
        Args: {
          p_description: string
          p_plan_type: string
          p_target_user_id?: string
          p_title: string
        }
        Returns: string
      }
      create_action_task: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_plan_id: string
          p_priority?: string
          p_title: string
        }
        Returns: string
      }
      create_brand: {
        Args: {
          p_category: string
          p_facebook_url?: string
          p_instagram_url?: string
          p_logo_url: string
          p_name: string
          p_short_description: string
          p_website_url: string
        }
        Returns: string
      }
      deactivate_brand: { Args: { p_brand_id: string }; Returns: undefined }
      delete_action_plan: { Args: { p_plan_id: string }; Returns: undefined }
      delete_action_task: { Args: { p_task_id: string }; Returns: undefined }
      get_user_active_brands_count: {
        Args: { check_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_user: { Args: { check_user_id: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      reject_brand: {
        Args: { p_brand_id: string; p_reason: string }
        Returns: undefined
      }
      update_action_plan: {
        Args: { p_description: string; p_plan_id: string; p_title: string }
        Returns: undefined
      }
      update_action_task: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_priority?: string
          p_status?: string
          p_task_id: string
          p_title: string
        }
        Returns: undefined
      }
      update_brand: {
        Args: {
          p_brand_id: string
          p_category: string
          p_facebook_url?: string
          p_instagram_url?: string
          p_logo_url: string
          p_name: string
          p_short_description: string
          p_website_url: string
        }
        Returns: undefined
      }
      update_task_status: {
        Args: { p_status: string; p_task_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      plan_type: "global" | "individual" | "admin_personalizado"
      task_origin: "sistema" | "admin" | "mentorado"
      task_status: "a_fazer" | "em_andamento" | "concluida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      plan_type: ["global", "individual", "admin_personalizado"],
      task_origin: ["sistema", "admin", "mentorado"],
      task_status: ["a_fazer", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
