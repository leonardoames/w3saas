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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      brand_likes: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_likes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_likes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
        ]
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
      channel_settings: {
        Row: {
          channel_key: string
          created_at: string
          id: string
          min_roas: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_key: string
          created_at?: string
          id?: string
          min_roas?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_key?: string
          created_at?: string
          id?: string
          min_roas?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          order: number
          title: string
        }
        Insert: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order: number
          title: string
        }
        Update: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          order: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_results: {
        Row: {
          created_at: string | null
          data: string
          id: string
          investimento: number | null
          pedidos_pagos: number | null
          receita_paga: number | null
          sessoes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          investimento?: number | null
          pedidos_pagos?: number | null
          receita_paga?: number | null
          sessoes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          investimento?: number | null
          pedidos_pagos?: number | null
          receita_paga?: number | null
          sessoes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dre_config: {
        Row: {
          cmv_pct: number
          created_at: string
          frete_liquido_pct: number
          id: string
          impostos_pct: number
          taxas_plataforma_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cmv_pct?: number
          created_at?: string
          frete_liquido_pct?: number
          id?: string
          impostos_pct?: number
          taxas_plataforma_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cmv_pct?: number
          created_at?: string
          frete_liquido_pct?: number
          id?: string
          impostos_pct?: number
          taxas_plataforma_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dre_despesas_avulsas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          id: string
          mes_referencia: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          id?: string
          mes_referencia: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          mes_referencia?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      dre_despesas_fixas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      dre_receitas_avulsas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          id: string
          mes_referencia: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          id?: string
          mes_referencia: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          mes_referencia?: string
          updated_at?: string
          user_id?: string
          valor?: number
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
      ia_instructions: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          instruction_type: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          instruction_type: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          instruction_type?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      idea_responsibles: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          channel: Database["public"]["Enums"]["idea_channel"]
          created_at: string
          description: string | null
          due_date: string | null
          format: Database["public"]["Enums"]["idea_format"]
          hook: string | null
          id: string
          objective: Database["public"]["Enums"]["idea_objective"]
          potential_score: number | null
          priority: Database["public"]["Enums"]["idea_priority"]
          publish_date: string | null
          published_url: string | null
          reference_url: string | null
          responsible: string | null
          status: Database["public"]["Enums"]["idea_status"]
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["idea_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["idea_channel"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          format: Database["public"]["Enums"]["idea_format"]
          hook?: string | null
          id?: string
          objective: Database["public"]["Enums"]["idea_objective"]
          potential_score?: number | null
          priority?: Database["public"]["Enums"]["idea_priority"]
          publish_date?: string | null
          published_url?: string | null
          reference_url?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["idea_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["idea_channel"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          format?: Database["public"]["Enums"]["idea_format"]
          hook?: string | null
          id?: string
          objective?: Database["public"]["Enums"]["idea_objective"]
          potential_score?: number | null
          priority?: Database["public"]["Enums"]["idea_priority"]
          publish_date?: string | null
          published_url?: string | null
          reference_url?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["idea_type"]
          updated_at?: string
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
      mentoria_products: {
        Row: {
          button_text: string | null
          created_at: string
          description: string | null
          details_url: string | null
          display_order: number
          id: string
          image_url: string | null
          tagline: string | null
          title: string
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          details_url?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          tagline?: string | null
          title: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          details_url?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      metrics_diarias: {
        Row: {
          cliques: number | null
          created_at: string
          data: string
          faturamento: number | null
          id: string
          impressoes: number | null
          investimento_trafego: number | null
          platform: string | null
          sessoes: number | null
          updated_at: string
          user_id: string
          vendas_quantidade: number | null
          vendas_valor: number | null
        }
        Insert: {
          cliques?: number | null
          created_at?: string
          data: string
          faturamento?: number | null
          id?: string
          impressoes?: number | null
          investimento_trafego?: number | null
          platform?: string | null
          sessoes?: number | null
          updated_at?: string
          user_id: string
          vendas_quantidade?: number | null
          vendas_valor?: number | null
        }
        Update: {
          cliques?: number | null
          created_at?: string
          data?: string
          faturamento?: number | null
          id?: string
          impressoes?: number | null
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
      miro_embeds: {
        Row: {
          created_at: string
          embed_src: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embed_src: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embed_src?: string
          id?: string
          updated_at?: string
          user_id?: string
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
      plan_aulas: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          lesson_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          lesson_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          lesson_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_aulas_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_ferramentas: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          external_url: string | null
          file_url: string | null
          id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          estoque_atual: number | null
          estoque_seguranca: number | null
          id: string
          lead_time_maximo: number | null
          lead_time_medio: number | null
          nome: string
          origem_importacao: string | null
          preco_venda: number | null
          sku: string
          tipo_reposicao: string | null
          updated_at: string | null
          user_id: string
          variante: string | null
          vendas_por_dia: number | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          estoque_atual?: number | null
          estoque_seguranca?: number | null
          id?: string
          lead_time_maximo?: number | null
          lead_time_medio?: number | null
          nome: string
          origem_importacao?: string | null
          preco_venda?: number | null
          sku: string
          tipo_reposicao?: string | null
          updated_at?: string | null
          user_id: string
          variante?: string | null
          vendas_por_dia?: number | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          estoque_atual?: number | null
          estoque_seguranca?: number | null
          id?: string
          lead_time_maximo?: number | null
          lead_time_medio?: number | null
          nome?: string
          origem_importacao?: string | null
          preco_venda?: number | null
          sku?: string
          tipo_reposicao?: string | null
          updated_at?: string | null
          user_id?: string
          variante?: string | null
          vendas_por_dia?: number | null
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
          is_admin_deprecated: boolean | null
          is_ecommerce: boolean | null
          is_mentorado: boolean
          is_w3_client: boolean
          last_login_at: string | null
          must_change_password: boolean
          onboarding_completed: boolean | null
          plan_type: string
          revenue_goal: number | null
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
          is_admin_deprecated?: boolean | null
          is_ecommerce?: boolean | null
          is_mentorado?: boolean
          is_w3_client?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          onboarding_completed?: boolean | null
          plan_type?: string
          revenue_goal?: number | null
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
          is_admin_deprecated?: boolean | null
          is_ecommerce?: boolean | null
          is_mentorado?: boolean
          is_w3_client?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          onboarding_completed?: boolean | null
          plan_type?: string
          revenue_goal?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_products: {
        Row: {
          created_at: string | null
          extra_fees_pct: number | null
          fixed_costs_pct: number | null
          gateway_fee_pct: number | null
          id: string
          media_cost_pct: number | null
          name: string
          platform_fee_pct: number | null
          product_cost: number | null
          selling_price: number | null
          sku: string | null
          taxes_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extra_fees_pct?: number | null
          fixed_costs_pct?: number | null
          gateway_fee_pct?: number | null
          id?: string
          media_cost_pct?: number | null
          name: string
          platform_fee_pct?: number | null
          product_cost?: number | null
          selling_price?: number | null
          sku?: string | null
          taxes_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          extra_fees_pct?: number | null
          fixed_costs_pct?: number | null
          gateway_fee_pct?: number | null
          id?: string
          media_cost_pct?: number | null
          name?: string
          platform_fee_pct?: number | null
          product_cost?: number | null
          selling_price?: number | null
          sku?: string | null
          taxes_pct?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_scenarios: {
        Row: {
          created_at: string | null
          current_rate: number | null
          current_ticket: number | null
          current_visits: number | null
          id: string
          name: string
          new_rate: number | null
          new_ticket: number | null
          new_visits: number | null
          product_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_rate?: number | null
          current_ticket?: number | null
          current_visits?: number | null
          id?: string
          name: string
          new_rate?: number | null
          new_ticket?: number | null
          new_visits?: number | null
          product_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_rate?: number | null
          current_ticket?: number | null
          current_visits?: number | null
          id?: string
          name?: string
          new_rate?: number | null
          new_ticket?: number | null
          new_visits?: number | null
          product_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_scenarios_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_reposicao: {
        Row: {
          created_at: string
          data_ultimo_pedido: string | null
          estoque_atual: number
          estoque_seguranca: number
          id: string
          lead_time_maximo: number
          lead_time_medio: number
          nome_peca: string
          observacoes: string | null
          product_id: string | null
          sku: string
          tipo_reposicao: Database["public"]["Enums"]["tipo_reposicao"]
          updated_at: string
          user_id: string
          variante: string | null
          vendas_por_dia: number
        }
        Insert: {
          created_at?: string
          data_ultimo_pedido?: string | null
          estoque_atual?: number
          estoque_seguranca?: number
          id?: string
          lead_time_maximo?: number
          lead_time_medio?: number
          nome_peca: string
          observacoes?: string | null
          product_id?: string | null
          sku: string
          tipo_reposicao?: Database["public"]["Enums"]["tipo_reposicao"]
          updated_at?: string
          user_id: string
          variante?: string | null
          vendas_por_dia?: number
        }
        Update: {
          created_at?: string
          data_ultimo_pedido?: string | null
          estoque_atual?: number
          estoque_seguranca?: number
          id?: string
          lead_time_maximo?: number
          lead_time_medio?: number
          nome_peca?: string
          observacoes?: string | null
          product_id?: string | null
          sku?: string
          tipo_reposicao?: Database["public"]["Enums"]["tipo_reposicao"]
          updated_at?: string
          user_id?: string
          variante?: string | null
          vendas_por_dia?: number
        }
        Relationships: [
          {
            foreignKeyName: "sku_reposicao_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_carteiras: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          mentorado_id: string
          staff_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          mentorado_id: string
          staff_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          mentorado_id?: string
          staff_id?: string
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
      tutor_carteiras: {
        Row: {
          created_at: string
          id: string
          mentorado_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentorado_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentorado_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_teams: {
        Row: {
          created_at: string
          created_by: string | null
          cs_id: string
          id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cs_id: string
          id?: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cs_id?: string
          id?: string
          tutor_id?: string
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
      user_integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean
          last_sync_at: string | null
          platform: string
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform: string
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          platform?: string
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_payment_info: {
        Row: {
          created_at: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      user_integrations_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          platform: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_staff_carteira: {
        Args: { p_assign?: boolean; p_mentorado_id: string; p_staff_id: string }
        Returns: undefined
      }
      admin_assign_tutor_team: {
        Args: { p_assign?: boolean; p_cs_id: string; p_tutor_id: string }
        Returns: undefined
      }
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_set_client_role: {
        Args: { p_grant: boolean; p_role: string; target_user_id: string }
        Returns: undefined
      }
      admin_set_dash_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      admin_set_expiration: {
        Args: { expiration_date: string; target_user_id: string }
        Returns: undefined
      }
      admin_update_revenue_goal: {
        Args: { new_goal: number; target_user_id: string }
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
      get_dash_admin_mentorado_ids: {
        Args: never
        Returns: {
          mentorado_id: string
        }[]
      }
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
      app_role:
        | "admin"
        | "user"
        | "tutor"
        | "cs"
        | "master"
        | "cliente_w3"
        | "cliente_ames"
      idea_channel:
        | "instagram"
        | "tiktok"
        | "youtube"
        | "facebook"
        | "google"
        | "outro"
      idea_format:
        | "video_curto"
        | "carrossel"
        | "imagem_estatica"
        | "post_blog"
        | "stories"
        | "influenciador"
        | "video_longo"
      idea_objective:
        | "vendas_normal"
        | "acao_promocional"
        | "liveshop"
        | "branding"
        | "remarketing"
      idea_priority: "alta" | "media" | "baixa"
      idea_status:
        | "ideia"
        | "em_producao"
        | "aprovacao"
        | "agendado"
        | "publicado"
        | "arquivado"
      idea_type: "criativo_pago" | "organico" | "ambos"
      plan_type: "global" | "individual" | "admin_personalizado"
      task_origin: "sistema" | "admin" | "mentorado"
      task_status: "a_fazer" | "em_andamento" | "concluida" | "cancelada"
      tipo_reposicao: "producao_propria" | "compra_fornecedor"
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
      app_role: [
        "admin",
        "user",
        "tutor",
        "cs",
        "master",
        "cliente_w3",
        "cliente_ames",
      ],
      idea_channel: [
        "instagram",
        "tiktok",
        "youtube",
        "facebook",
        "google",
        "outro",
      ],
      idea_format: [
        "video_curto",
        "carrossel",
        "imagem_estatica",
        "post_blog",
        "stories",
        "influenciador",
        "video_longo",
      ],
      idea_objective: [
        "vendas_normal",
        "acao_promocional",
        "liveshop",
        "branding",
        "remarketing",
      ],
      idea_priority: ["alta", "media", "baixa"],
      idea_status: [
        "ideia",
        "em_producao",
        "aprovacao",
        "agendado",
        "publicado",
        "arquivado",
      ],
      idea_type: ["criativo_pago", "organico", "ambos"],
      plan_type: ["global", "individual", "admin_personalizado"],
      task_origin: ["sistema", "admin", "mentorado"],
      task_status: ["a_fazer", "em_andamento", "concluida", "cancelada"],
      tipo_reposicao: ["producao_propria", "compra_fornecedor"],
    },
  },
} as const
