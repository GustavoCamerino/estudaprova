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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      active_users: {
        Row: {
          created_at: string
          id: string
          last_activity: string
          page_url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity?: string
          page_url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity?: string
          page_url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_user: boolean
          message_type: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_user?: boolean
          message_type?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_user?: boolean
          message_type?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          participant_address: string
          participant_email: string
          participant_name: string
          participant_phone: string
          registration_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          participant_address: string
          participant_email: string
          participant_name: string
          participant_phone: string
          registration_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          participant_address?: string
          participant_email?: string
          participant_name?: string
          participant_phone?: string
          registration_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          current_registrations: number
          description: string
          event_date: string
          id: string
          image_url: string | null
          is_free: boolean
          location: string | null
          price: number | null
          published: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_registrations?: number
          description: string
          event_date: string
          id?: string
          image_url?: string | null
          is_free?: boolean
          location?: string | null
          price?: number | null
          published?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_registrations?: number
          description?: string
          event_date?: string
          id?: string
          image_url?: string | null
          is_free?: boolean
          location?: string | null
          price?: number | null
          published?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          route_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          route_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          route_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_content: {
        Row: {
          content: Json
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          id: string
          pdf_id: string
          session_id: string | null
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          pdf_id: string
          session_id?: string | null
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          pdf_id?: string
          session_id?: string | null
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_content_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      habits: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          frequency: string
          icon: string | null
          id: string
          name: string
          target_value: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          name: string
          target_value?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          name?: string
          target_value?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          reminder_enabled: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          reminder_enabled?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          reminder_enabled?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenances: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          km_at_maintenance: number | null
          maintenance_date: string
          next_maintenance_km: number | null
          notes: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          km_at_maintenance?: number | null
          maintenance_date: string
          next_maintenance_km?: number | null
          notes?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          km_at_maintenance?: number | null
          maintenance_date?: string
          next_maintenance_km?: number | null
          notes?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_applications: {
        Row: {
          areas_of_interest: string | null
          course: string | null
          created_at: string
          email: string
          id: string
          motivation: string | null
          name: string
          period: string | null
          programming_experience: string | null
          updated_at: string
        }
        Insert: {
          areas_of_interest?: string | null
          course?: string | null
          created_at?: string
          email: string
          id?: string
          motivation?: string | null
          name: string
          period?: string | null
          programming_experience?: string | null
          updated_at?: string
        }
        Update: {
          areas_of_interest?: string | null
          course?: string | null
          created_at?: string
          email?: string
          id?: string
          motivation?: string | null
          name?: string
          period?: string | null
          programming_experience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          expires_at: string | null
          id: string
          order_number: string
          paid_at: string | null
          payment_id: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          expires_at?: string | null
          id?: string
          order_number: string
          paid_at?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          expires_at?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_analytics: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          page: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      page_contents: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_name: string
          section_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_name: string
          section_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_name?: string
          section_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdfs: {
        Row: {
          created_at: string
          extracted_content: string | null
          file_path: string
          file_size: number | null
          filename: string
          id: string
          json_content: Json | null
          original_name: string
          processing_status: string | null
          session_id: string | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_content?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          json_content?: Json | null
          original_name: string
          processing_status?: string | null
          session_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_content?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          json_content?: Json | null
          original_name?: string
          processing_status?: string | null
          session_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdfs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_goals: {
        Row: {
          annual_progress: number
          category: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          monthly_progress: number
          priority: string
          progress: number
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_progress?: number
          category: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          monthly_progress?: number
          priority: string
          progress?: number
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_progress?: number
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          monthly_progress?: number
          priority?: string
          progress?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_tasks: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          duration: number
          id: string
          priority: string
          subject: string
          task_date: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          priority: string
          subject: string
          task_date: string
          task_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          priority?: string
          subject?: string
          task_date?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenues: {
        Row: {
          amount: number
          client_name: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          revenue_date: string
          route_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          revenue_date: string
          route_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          revenue_date?: string
          route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          destination: string
          driver_name: string
          id: string
          km_traveled: number | null
          service_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          value: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination: string
          driver_name: string
          id?: string
          km_traveled?: number | null
          service_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          value?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination?: string
          driver_name?: string
          id?: string
          km_traveled?: number | null
          service_date?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          value?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          exam_date: string | null
          id: string
          schedule: Json | null
          subjects: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          id?: string
          schedule?: Json | null
          subjects?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          id?: string
          schedule?: Json | null
          subjects?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          completed_at: string
          content_id: string | null
          duration_minutes: number | null
          id: string
          score: number | null
          session_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_id?: string | null
          duration_minutes?: number | null
          id?: string
          score?: number | null
          session_type: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content_id?: string | null
          duration_minutes?: number | null
          id?: string
          score?: number | null
          session_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pdfs_uploaded_this_month: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pdfs_uploaded_this_month?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pdfs_uploaded_this_month?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          position: string
          social_links: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          position: string
          social_links?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          approved: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicles: {
        Row: {
          average_consumption: number | null
          capacity: number | null
          created_at: string
          current_km: number | null
          id: string
          model: string
          notes: string | null
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"] | null
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          year: number
        }
        Insert: {
          average_consumption?: number | null
          capacity?: number | null
          created_at?: string
          current_km?: number | null
          id?: string
          model: string
          notes?: string | null
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year: number
        }
        Update: {
          average_consumption?: number | null
          capacity?: number | null
          created_at?: string
          current_km?: number | null
          id?: string
          model?: string
          notes?: string | null
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          duration_minutes: number | null
          exercises_completed: Json
          id: string
          notes: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          duration_minutes?: number | null
          exercises_completed?: Json
          id?: string
          notes?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          duration_minutes?: number | null
          exercises_completed?: Json
          id?: string
          notes?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string
          duration_minutes: number | null
          equipment: string[] | null
          exercises: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number | null
          equipment?: string[] | null
          exercises?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number | null
          equipment?: string[] | null
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_activity: {
        Args: { page_url?: string; user_agent?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "premium" | "user"
      content_type: "summary" | "flashcards" | "quiz"
      expense_category:
        | "combustivel"
        | "manutencao"
        | "diarias"
        | "pagamento_funcionario"
        | "impostos"
        | "outros"
      service_type: "transporte" | "terraplanagem" | "carregamento" | "outros"
      subscription_type: "free" | "premium"
      user_role: "admin" | "funcionario"
      vehicle_status: "ativo" | "inativo" | "manutencao"
      vehicle_type: "trator" | "pa_carregadeira" | "caminhao" | "outros"
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
      app_role: ["admin", "premium", "user"],
      content_type: ["summary", "flashcards", "quiz"],
      expense_category: [
        "combustivel",
        "manutencao",
        "diarias",
        "pagamento_funcionario",
        "impostos",
        "outros",
      ],
      service_type: ["transporte", "terraplanagem", "carregamento", "outros"],
      subscription_type: ["free", "premium"],
      user_role: ["admin", "funcionario"],
      vehicle_status: ["ativo", "inativo", "manutencao"],
      vehicle_type: ["trator", "pa_carregadeira", "caminhao", "outros"],
    },
  },
} as const
