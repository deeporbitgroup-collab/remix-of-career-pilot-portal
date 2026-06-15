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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_admin_id: string | null
          created_at: string | null
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_admin_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_admin_id?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_associate_messages: {
        Row: {
          associate_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          sender_role: string
          subject: string
          updated_at: string
        }
        Insert: {
          associate_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          sender_role: string
          subject: string
          updated_at?: string
        }
        Update: {
          associate_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          sender_role?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_associate_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "admin_associate_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_company_messages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          sender_role: string
          subject: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          sender_role: string
          subject: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          sender_role?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_company_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_company_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "admin_company_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_partner_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          partner_id: string
          sender_role: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          partner_id: string
          sender_role: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          partner_id?: string
          sender_role?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_partner_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "admin_partner_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_student_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          sender_role: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          sender_role: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          sender_role?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_student_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "admin_student_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_student_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          storage_path: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          created_by: string
          id: string
          priority: boolean | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          priority?: boolean | null
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          priority?: boolean | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_password_resets: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          start_time: string
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          start_time: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_admin_messages: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_role: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_role: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_admin_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_associate_requests: {
        Row: {
          associate_id: string
          client_id: string
          created_at: string | null
          id: string
          message: string | null
          proposed_timeslots: Json | null
          sector: string | null
          selected_timeslot: Json | null
          service_id: string
          status: Database["public"]["Enums"]["associate_request_status"] | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          associate_id: string
          client_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          proposed_timeslots?: Json | null
          sector?: string | null
          selected_timeslot?: Json | null
          service_id: string
          status?:
            | Database["public"]["Enums"]["associate_request_status"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          associate_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          proposed_timeslots?: Json | null
          sector?: string | null
          selected_timeslot?: Json | null
          service_id?: string
          status?:
            | Database["public"]["Enums"]["associate_request_status"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_associate_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_associate_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_cart: {
        Row: {
          associate_id: string | null
          client_id: string
          created_at: string | null
          id: string
          sector: string | null
          service_id: string
          university: string | null
        }
        Insert: {
          associate_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          sector?: string | null
          service_id: string
          university?: string | null
        }
        Update: {
          associate_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          sector?: string | null
          service_id?: string
          university?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_cart_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cart_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cart_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: string | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          storage_path: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type?: string | null
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          storage_path: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback: {
        Row: {
          client_id: string
          comment: string
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          client_id: string
          comment: string
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          client_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meeting_slots: {
        Row: {
          associate_id: string | null
          created_at: string | null
          id: string
          project_id: string
          proposed_date: string | null
          proposed_time: string
          slot_role: string | null
          status: string
        }
        Insert: {
          associate_id?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          proposed_date?: string | null
          proposed_time: string
          slot_role?: string | null
          status?: string
        }
        Update: {
          associate_id?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          proposed_date?: string | null
          proposed_time?: string
          slot_role?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meeting_slots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meetings: {
        Row: {
          associate_id: string
          client_id: string
          created_at: string | null
          duration_minutes: number | null
          google_meet_link: string | null
          id: string
          meeting_date: string
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          associate_id: string
          client_id: string
          created_at?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          id?: string
          meeting_date: string
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          associate_id?: string
          client_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          id?: string
          meeting_date?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_orders: {
        Row: {
          associate_id: string | null
          client_id: string
          created_at: string | null
          discount_percentage: number | null
          id: string
          outreach_cover_letter_url: string | null
          outreach_custom_email: string | null
          outreach_cv_url: string | null
          payment_receipt_url: string | null
          payment_status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          associate_id?: string | null
          client_id: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          outreach_cover_letter_url?: string | null
          outreach_custom_email?: string | null
          outreach_cv_url?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          associate_id?: string | null
          client_id?: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          outreach_cover_letter_url?: string | null
          outreach_custom_email?: string | null
          outreach_cv_url?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_orders_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_password_resets: {
        Row: {
          client_id: string
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_password_resets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_documents: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects: {
        Row: {
          active_associate_id: string | null
          additional_call_reason: string | null
          associate_id: string | null
          backup_activated_at: string | null
          backup_associate_id: string | null
          client_id: string
          created_at: string | null
          google_meet_link: string | null
          id: string
          order_id: string
          primary_declined_at: string | null
          scheduling_status: string | null
          service_id: string
          specific_request: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          active_associate_id?: string | null
          additional_call_reason?: string | null
          associate_id?: string | null
          backup_activated_at?: string | null
          backup_associate_id?: string | null
          client_id: string
          created_at?: string | null
          google_meet_link?: string | null
          id?: string
          order_id: string
          primary_declined_at?: string | null
          scheduling_status?: string | null
          service_id: string
          specific_request?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          active_associate_id?: string | null
          additional_call_reason?: string | null
          associate_id?: string | null
          backup_activated_at?: string | null
          backup_associate_id?: string | null
          client_id?: string
          created_at?: string | null
          google_meet_link?: string | null
          id?: string
          order_id?: string
          primary_declined_at?: string | null
          scheduling_status?: string | null
          service_id?: string
          specific_request?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "client_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_subscription: boolean | null
          name: string
          price: number
          requires_associate: boolean | null
          requires_sector: boolean | null
          requires_university: boolean | null
          subcategory: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_subscription?: boolean | null
          name: string
          price: number
          requires_associate?: boolean | null
          requires_sector?: boolean | null
          requires_university?: boolean | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_subscription?: boolean | null
          name?: string
          price?: number
          requires_associate?: boolean | null
          requires_sector?: boolean | null
          requires_university?: boolean | null
          subcategory?: string | null
        }
        Relationships: []
      }
      client_shared_documents: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          project_id: string
          storage_path: string
          uploaded_by_id: string
          uploaded_by_type: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          project_id: string
          storage_path: string
          uploaded_by_id: string
          uploaded_by_type: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          storage_path?: string
          uploaded_by_id?: string
          uploaded_by_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_shared_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          brief_overview: Json | null
          created_at: string | null
          cv_url: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          linkedin_url: string | null
          password_hash: string
          phone: string
          photo_url: string | null
          status: string
          student_status: string
          updated_at: string | null
        }
        Insert: {
          brief_overview?: Json | null
          created_at?: string | null
          cv_url?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          linkedin_url?: string | null
          password_hash: string
          phone: string
          photo_url?: string | null
          status?: string
          student_status: string
          updated_at?: string | null
        }
        Update: {
          brief_overview?: Json | null
          created_at?: string | null
          cv_url?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
          password_hash?: string
          phone?: string
          photo_url?: string | null
          status?: string
          student_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          reference_email: string
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          reference_email: string
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          reference_email?: string
          sector?: string
          size?: Database["public"]["Enums"]["company_size"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_selected_students: {
        Row: {
          company_id: string
          created_at: string
          id: string
          selected_at: string
          student_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          selected_at?: string
          student_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          selected_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_selected_students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_selected_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          partner_id: string
          status: Database["public"]["Enums"]["consultation_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          status?: Database["public"]["Enums"]["consultation_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          status?: Database["public"]["Enums"]["consultation_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          mime: string | null
          size_bytes: number | null
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_members: {
        Row: {
          group_chat_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_chat_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_chat_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_members_group_chat_id_fkey"
            columns: ["group_chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          created_at: string | null
          group_chat_id: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string | null
          group_chat_id: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string | null
          group_chat_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_group_chat_id_fkey"
            columns: ["group_chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chats: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kb_admin_audit_logs: {
        Row: {
          action: string
          admin_username: string
          created_at: string
          details: string | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_username: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_username?: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      kb_admins: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      kb_client_access: {
        Row: {
          block_reason: string | null
          client_id: string
          created_at: string
          id: string
          is_blocked: boolean
          order_id: string
          product_id: string
        }
        Insert: {
          block_reason?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          order_id: string
          product_id: string
        }
        Update: {
          block_reason?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          order_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_client_access_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "kb_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_client_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "kb_products"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_login_attempts: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          success: boolean
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          username?: string
        }
        Relationships: []
      }
      kb_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "kb_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "kb_products"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_orders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          payment_receipt_url: string | null
          payment_status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          payment_receipt_url?: string | null
          payment_status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          payment_receipt_url?: string | null
          payment_status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_products: {
        Row: {
          asset_filename: string | null
          asset_storage_path: string | null
          bundle_product_ids: string[] | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_bundle: boolean
          overview_images: string[] | null
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          asset_filename?: string | null
          asset_storage_path?: string | null
          bundle_product_ids?: string[] | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_bundle?: boolean
          overview_images?: string[] | null
          price: number
          title: string
          updated_at?: string
        }
        Update: {
          asset_filename?: string | null
          asset_storage_path?: string | null
          bundle_product_ids?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_bundle?: boolean
          overview_images?: string[] | null
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_definitions: {
        Row: {
          applies_to: Database["public"]["Enums"]["user_role"]
          chart_type: Database["public"]["Enums"]["kpi_chart_type"] | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          label: string
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          applies_to: Database["public"]["Enums"]["user_role"]
          chart_type?: Database["public"]["Enums"]["kpi_chart_type"] | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          label: string
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["user_role"]
          chart_type?: Database["public"]["Enums"]["kpi_chart_type"] | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          label?: string
          order_index?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kpi_values: {
        Row: {
          created_at: string | null
          id: string
          kpi_definition_id: string
          updated_at: string | null
          updated_by_admin_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpi_definition_id: string
          updated_at?: string | null
          updated_by_admin_id?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          kpi_definition_id?: string
          updated_at?: string | null
          updated_by_admin_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_values_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_updated_by_admin_id_fkey"
            columns: ["updated_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          mime_type: string | null
          partner_id: string
          size_bytes: number | null
          storage_path: string | null
          type: string
          updated_at: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          mime_type?: string | null
          partner_id: string
          size_bytes?: number | null
          storage_path?: string | null
          type: string
          updated_at?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          mime_type?: string | null
          partner_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          type?: string
          updated_at?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: []
      }
      pathways_applications: {
        Row: {
          category: Database["public"]["Enums"]["pathways_category"]
          created_at: string | null
          created_via: string | null
          id: string
          language: string | null
          motivation: string
          notified_student: boolean | null
          organization_name: string | null
          period_from: string
          period_to: string
          phone: string
          provider_id: string | null
          school: string
          status:
            | Database["public"]["Enums"]["pathways_application_status"]
            | null
          subcategory: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["pathways_category"]
          created_at?: string | null
          created_via?: string | null
          id?: string
          language?: string | null
          motivation: string
          notified_student?: boolean | null
          organization_name?: string | null
          period_from: string
          period_to: string
          phone: string
          provider_id?: string | null
          school: string
          status?:
            | Database["public"]["Enums"]["pathways_application_status"]
            | null
          subcategory: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["pathways_category"]
          created_at?: string | null
          created_via?: string | null
          id?: string
          language?: string | null
          motivation?: string
          notified_student?: boolean | null
          organization_name?: string | null
          period_from?: string
          period_to?: string
          phone?: string
          provider_id?: string | null
          school?: string
          status?:
            | Database["public"]["Enums"]["pathways_application_status"]
            | null
          subcategory?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathways_applications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pathways_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathways_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathways_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          parent_message_id: string | null
          recipient_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["pathways_role"]
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          parent_message_id?: string | null
          recipient_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["pathways_role"]
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          parent_message_id?: string | null
          recipient_id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["pathways_role"]
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathways_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "pathways_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathways_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathways_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways_password_resets: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathways_password_resets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways_payment_receipts: {
        Row: {
          created_at: string | null
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathways_payment_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pathways_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways_providers: {
        Row: {
          active: boolean | null
          category: Database["public"]["Enums"]["pathways_category"]
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          is_online: boolean | null
          logo_url: string | null
          name: string
          requirements: string | null
          subcategory: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          active?: boolean | null
          category: Database["public"]["Enums"]["pathways_category"]
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean | null
          logo_url?: string | null
          name: string
          requirements?: string | null
          subcategory: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          active?: boolean | null
          category?: Database["public"]["Enums"]["pathways_category"]
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean | null
          logo_url?: string | null
          name?: string
          requirements?: string | null
          subcategory?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      pathways_users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          password_hash: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["pathways_role"]
          school: string | null
          status: Database["public"]["Enums"]["pathways_user_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash: string
          phone?: string | null
          photo_url?: string | null
          role: Database["public"]["Enums"]["pathways_role"]
          school?: string | null
          status?: Database["public"]["Enums"]["pathways_user_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["pathways_role"]
          school?: string | null
          status?: Database["public"]["Enums"]["pathways_user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prep_materials: {
        Row: {
          created_at: string
          description: string | null
          filename: string
          id: string
          mime: string | null
          service: string
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          filename: string
          id?: string
          mime?: string | null
          service: string
          size_bytes?: number | null
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          filename?: string
          id?: string
          mime?: string | null
          service?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_data: Json | null
          certifications: Json | null
          company_2: string | null
          company_name: string | null
          created_at: string | null
          cv_url: string | null
          email: string
          email_verified_at: string | null
          first_name: string | null
          id: string
          languages: Json | null
          last_name: string | null
          linkedin_url: string | null
          master_program: string | null
          overview_url: string | null
          phone: string
          photo_url: string | null
          professional_experiences: Json | null
          profile_presentation: Json | null
          profile_status: Json | null
          role: Database["public"]["Enums"]["user_role"]
          sector: string | null
          sector_2: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled: boolean | null
          two_fa_secret: string | null
          university: string | null
          university_2: string | null
          updated_at: string | null
        }
        Insert: {
          about_data?: Json | null
          certifications?: Json | null
          company_2?: string | null
          company_name?: string | null
          created_at?: string | null
          cv_url?: string | null
          email: string
          email_verified_at?: string | null
          first_name?: string | null
          id: string
          languages?: Json | null
          last_name?: string | null
          linkedin_url?: string | null
          master_program?: string | null
          overview_url?: string | null
          phone: string
          photo_url?: string | null
          professional_experiences?: Json | null
          profile_presentation?: Json | null
          profile_status?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          sector?: string | null
          sector_2?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled?: boolean | null
          two_fa_secret?: string | null
          university?: string | null
          university_2?: string | null
          updated_at?: string | null
        }
        Update: {
          about_data?: Json | null
          certifications?: Json | null
          company_2?: string | null
          company_name?: string | null
          created_at?: string | null
          cv_url?: string | null
          email?: string
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          languages?: Json | null
          last_name?: string | null
          linkedin_url?: string | null
          master_program?: string | null
          overview_url?: string | null
          phone?: string
          photo_url?: string | null
          professional_experiences?: Json | null
          profile_presentation?: Json | null
          profile_status?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          sector?: string | null
          sector_2?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled?: boolean | null
          two_fa_secret?: string | null
          university?: string | null
          university_2?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recruiting_documents: {
        Row: {
          created_at: string
          document_type: string
          file_size: number | null
          filename: string | null
          id: string
          link_url: string | null
          mime_type: string | null
          process_id: string
          storage_path: string | null
          uploader_id: string
          uploader_name: string
          uploader_type: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          filename?: string | null
          id?: string
          link_url?: string | null
          mime_type?: string | null
          process_id: string
          storage_path?: string | null
          uploader_id: string
          uploader_name?: string
          uploader_type: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          filename?: string | null
          id?: string
          link_url?: string | null
          mime_type?: string | null
          process_id?: string
          storage_path?: string | null
          uploader_id?: string
          uploader_name?: string
          uploader_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiting_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "recruiting_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiting_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          process_id: string
          sender_id: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          process_id: string
          sender_id: string
          sender_name?: string
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          process_id?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiting_messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "recruiting_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiting_processes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          next_step: Database["public"]["Enums"]["recruiting_next_step"]
          notes: string | null
          selection_id: string | null
          status: Database["public"]["Enums"]["recruiting_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          next_step: Database["public"]["Enums"]["recruiting_next_step"]
          notes?: string | null
          selection_id?: string | null
          status?: Database["public"]["Enums"]["recruiting_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          next_step?: Database["public"]["Enums"]["recruiting_next_step"]
          notes?: string | null
          selection_id?: string | null
          status?: Database["public"]["Enums"]["recruiting_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiting_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiting_processes_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "company_selected_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiting_processes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          access_status: Database["public"]["Enums"]["access_status"] | null
          compensation_preference: string | null
          cover_letter_url: string | null
          created_at: string | null
          cv_url: string | null
          first_name: string
          full_employment_available: boolean | null
          id: string
          internship_duration_months: number | null
          internship_end_date: string | null
          internship_period: string | null
          internship_start_date: string | null
          last_name: string
          linkedin_url: string | null
          monthly_payment_active: boolean | null
          monthly_payment_start_date: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          phone: string
          photo_url: string | null
          preferred_company_types: string[] | null
          preferred_locations: string[] | null
          preferred_sectors: string[] | null
          presentation_video_url: string | null
          profile_visible_to_companies: boolean
          stage_payment_paid: boolean | null
          stage_payment_required: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_status?: Database["public"]["Enums"]["access_status"] | null
          compensation_preference?: string | null
          cover_letter_url?: string | null
          created_at?: string | null
          cv_url?: string | null
          first_name: string
          full_employment_available?: boolean | null
          id?: string
          internship_duration_months?: number | null
          internship_end_date?: string | null
          internship_period?: string | null
          internship_start_date?: string | null
          last_name: string
          linkedin_url?: string | null
          monthly_payment_active?: boolean | null
          monthly_payment_start_date?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phone: string
          photo_url?: string | null
          preferred_company_types?: string[] | null
          preferred_locations?: string[] | null
          preferred_sectors?: string[] | null
          presentation_video_url?: string | null
          profile_visible_to_companies?: boolean
          stage_payment_paid?: boolean | null
          stage_payment_required?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_status?: Database["public"]["Enums"]["access_status"] | null
          compensation_preference?: string | null
          cover_letter_url?: string | null
          created_at?: string | null
          cv_url?: string | null
          first_name?: string
          full_employment_available?: boolean | null
          id?: string
          internship_duration_months?: number | null
          internship_end_date?: string | null
          internship_period?: string | null
          internship_start_date?: string | null
          last_name?: string
          linkedin_url?: string | null
          monthly_payment_active?: boolean | null
          monthly_payment_start_date?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phone?: string
          photo_url?: string | null
          preferred_company_types?: string[] | null
          preferred_locations?: string[] | null
          preferred_sectors?: string[] | null
          presentation_video_url?: string | null
          profile_visible_to_companies?: boolean
          stage_payment_paid?: boolean | null
          stage_payment_required?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      talent_pool_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_password_resets: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_password_resets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_payment_receipts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_type: string
          receipt_url: string | null
          upload_date: string | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_type: string
          receipt_url?: string | null
          upload_date?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          receipt_url?: string | null
          upload_date?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_payment_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          proof_url: string | null
          reference: string
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          reference: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          password_hash: string
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          role: Database["public"]["Enums"]["talent_pool_role"]
          status: Database["public"]["Enums"]["talent_pool_user_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          role: Database["public"]["Enums"]["talent_pool_role"]
          status?: Database["public"]["Enums"]["talent_pool_user_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          role?: Database["public"]["Enums"]["talent_pool_role"]
          status?: Database["public"]["Enums"]["talent_pool_user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_companies: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          email: string
          id: string
          linkedin_url: string
          logo_url: string
          profile_id: string
          reference_email: string
          registration_status: Database["public"]["Enums"]["registration_status"]
          role: Database["public"]["Enums"]["talent_pool_role"]
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          status: Database["public"]["Enums"]["talent_pool_user_status"]
          updated_at: string
        }[]
      }
      admin_get_company_selections: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          id: string
          selected_at: string
          student_email: string
          student_first_name: string
          student_id: string
          student_last_name: string
        }[]
      }
      admin_get_payment_receipts: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          first_name: string
          id: string
          last_name: string
          notes: string
          payment_type: string
          phone: string
          receipt_url: string
          upload_date: string
          user_email: string
          user_id: string
          verification_status: string
          verified_at: string
          verified_by: string
        }[]
      }
      admin_get_students: {
        Args: never
        Returns: {
          access_status: Database["public"]["Enums"]["access_status"]
          cover_letter_url: string
          created_at: string
          cv_url: string
          email: string
          first_name: string
          id: string
          last_name: string
          linkedin_url: string
          monthly_payment_active: boolean
          monthly_payment_start_date: string
          payment_reference: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          photo_url: string
          profile_id: string
          profile_visible_to_companies: boolean
          registration_status: Database["public"]["Enums"]["registration_status"]
          role: Database["public"]["Enums"]["talent_pool_role"]
          status: Database["public"]["Enums"]["talent_pool_user_status"]
          updated_at: string
        }[]
      }
      admin_toggle_student_visibility: {
        Args: { _user_id: string; _visible: boolean }
        Returns: Json
      }
      admin_verify_payment_and_grant_access: {
        Args: { _receipt_id: string; _user_id: string }
        Returns: undefined
      }
      availability_delete: { Args: { _id: string }; Returns: undefined }
      availability_upsert: {
        Args: {
          _date: string
          _end: string
          _id?: string
          _start: string
          _tz?: string
        }
        Returns: string
      }
      create_admin_profile: { Args: { user_email: string }; Returns: undefined }
      delete_user_completely: { Args: { user_id: string }; Returns: undefined }
      doc_insert: {
        Args: {
          _filename: string
          _mime: string
          _size: number
          _storage_path: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      doc_latest: {
        Args: { _type: string; _user_id: string }
        Returns: {
          created_at: string | null
          filename: string
          id: string
          mime: string | null
          size_bytes: number | null
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          user_id: string
          version: number | null
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_pathways_admin_threads: {
        Args: never
        Returns: {
          last_message: string
          last_message_at: string
          student_email: string
          student_id: string
          student_name: string
          unread_count: number
        }[]
      }
      get_pathways_student_threads: {
        Args: { student_user_id: string }
        Returns: {
          admin_name: string
          last_message: string
          last_message_at: string
          thread_id: string
          unread_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_talent_pool_admin: { Args: { _uid: string }; Returns: boolean }
      request_auth_password_reset: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      reset_auth_password: {
        Args: { _new_password: string; _token: string }
        Returns: boolean
      }
      talent_pool_create_company_profile: {
        Args: {
          _company_name: string
          _linkedin_url: string
          _reference_email: string
          _sector: string
          _size: Database["public"]["Enums"]["company_size"]
          _user_id: string
        }
        Returns: string
      }
      talent_pool_get_companies_for_student: {
        Args: { _user_id: string }
        Returns: {
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          reference_email: string
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          updated_at: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      talent_pool_get_latest_payment: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          proof_url: string | null
          reference: string
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "talent_pool_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      talent_pool_get_student_profile: {
        Args: { _user_id: string }
        Returns: {
          access_status: Database["public"]["Enums"]["access_status"] | null
          compensation_preference: string | null
          cover_letter_url: string | null
          created_at: string | null
          cv_url: string | null
          first_name: string
          full_employment_available: boolean | null
          id: string
          internship_duration_months: number | null
          internship_end_date: string | null
          internship_period: string | null
          internship_start_date: string | null
          last_name: string
          linkedin_url: string | null
          monthly_payment_active: boolean | null
          monthly_payment_start_date: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          phone: string
          photo_url: string | null
          preferred_company_types: string[] | null
          preferred_locations: string[] | null
          preferred_sectors: string[] | null
          presentation_video_url: string | null
          profile_visible_to_companies: boolean
          stage_payment_paid: boolean | null
          stage_payment_required: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      talent_pool_get_user_with_profile: {
        Args: { _user_id: string }
        Returns: Json
      }
      talent_pool_login: {
        Args: {
          _email: string
          _password: string
          _role: Database["public"]["Enums"]["talent_pool_role"]
        }
        Returns: Json
      }
      talent_pool_register_student: {
        Args: {
          _email: string
          _first_name: string
          _last_name: string
          _linkedin: string
          _password_hash: string
          _phone: string
        }
        Returns: string
      }
      talent_pool_register_user: {
        Args: { _email: string; _password_base64: string; _role?: string }
        Returns: string
      }
      talent_pool_request_password_reset: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["talent_pool_role"]
        }
        Returns: string
      }
      talent_pool_reset_password: {
        Args: { _new_password: string; _token: string }
        Returns: boolean
      }
      talent_pool_update_student_documents: {
        Args: { _cover_url: string; _cv_url: string; _user_id: string }
        Returns: undefined
      }
      talent_pool_update_student_photo: {
        Args: { _photo_url: string; _user_id: string }
        Returns: undefined
      }
      talent_pool_update_student_preferences: {
        Args: {
          _compensation_preference: string
          _internship_end_date?: string
          _internship_period: string
          _internship_start_date?: string
          _preferred_company_types: string[]
          _preferred_locations?: string[]
          _preferred_sectors: string[]
          _user_id: string
        }
        Returns: undefined
      }
      tp_admin_delete_payment_receipt: {
        Args: { _receipt_id: string }
        Returns: undefined
      }
      tp_admin_delete_user: { Args: { _user_id: string }; Returns: undefined }
      tp_admin_revoke_student: {
        Args: { _user_id: string }
        Returns: undefined
      }
      tp_is_student: { Args: { _uid: string }; Returns: boolean }
      tp_set_company_status: {
        Args: {
          _admin_id?: string
          _company_id: string
          _new_status: Database["public"]["Enums"]["registration_status"]
        }
        Returns: undefined
      }
      tp_set_student_status: {
        Args: {
          _admin_id?: string
          _new_status: Database["public"]["Enums"]["talent_pool_user_status"]
          _student_id: string
        }
        Returns: undefined
      }
      update_company_profile: {
        Args: {
          p_company_name: string
          p_description?: string
          p_linkedin_url: string
          p_logo_url: string
          p_reference_email: string
          p_sector: string
          p_size: Database["public"]["Enums"]["company_size"]
          p_user_id: string
        }
        Returns: {
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          reference_email: string
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          updated_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      access_status: "BLOCKED" | "UNLOCKED"
      associate_request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "waiting_availability"
        | "availability_provided"
        | "awaiting_payment"
        | "confirmed_paid"
      company_size: "STARTUP" | "BOUTIQUE" | "MEDIUM_SIZE" | "LARGE_COMPANY"
      consultation_status: "new" | "in_progress" | "closed"
      document_type: "CV" | "CONTRACT" | "PARTNER_DOC" | "ADMIN_TEMPLATE"
      kpi_chart_type: "number" | "bar" | "pie"
      pathways_application_status:
        | "submitted"
        | "in_review"
        | "accepted"
        | "rejected"
      pathways_category:
        | "volunteering"
        | "languages"
        | "exchange"
        | "public_speaking"
        | "UNIVERSITY"
        | "INTERNSHIP"
        | "LANGUAGE_COURSE"
        | "VOLUNTEERING"
        | "EXPERIENCE"
      pathways_role: "STUDENT" | "ADMIN"
      pathways_user_status:
        | "registered"
        | "admitted_to_payment"
        | "payment_uploaded"
        | "active"
        | "revoked"
      payment_status:
        | "NOT_PAID"
        | "AWAITING_VERIFICATION"
        | "VERIFYING"
        | "VERIFIED"
        | "REJECTED"
      recruiting_next_step: "DIRECT_HIRING" | "INTERVIEW" | "ONLINE_ASSESSMENT"
      recruiting_status: "ACTIVE" | "COMPLETED" | "CANCELLED"
      registration_status: "PENDING" | "APPROVED" | "REJECTED" | "ADMITTED"
      talent_pool_role: "ADMIN" | "STUDENT" | "COMPANY"
      talent_pool_user_status:
        | "pending_review"
        | "accepted_pending_payment"
        | "payment_uploaded"
        | "rejected"
        | "active_member"
      user_role: "ASSOCIATE" | "PARTNER" | "ADMIN"
      user_status: "pending" | "approved" | "rejected"
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
      access_status: ["BLOCKED", "UNLOCKED"],
      associate_request_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "waiting_availability",
        "availability_provided",
        "awaiting_payment",
        "confirmed_paid",
      ],
      company_size: ["STARTUP", "BOUTIQUE", "MEDIUM_SIZE", "LARGE_COMPANY"],
      consultation_status: ["new", "in_progress", "closed"],
      document_type: ["CV", "CONTRACT", "PARTNER_DOC", "ADMIN_TEMPLATE"],
      kpi_chart_type: ["number", "bar", "pie"],
      pathways_application_status: [
        "submitted",
        "in_review",
        "accepted",
        "rejected",
      ],
      pathways_category: [
        "volunteering",
        "languages",
        "exchange",
        "public_speaking",
        "UNIVERSITY",
        "INTERNSHIP",
        "LANGUAGE_COURSE",
        "VOLUNTEERING",
        "EXPERIENCE",
      ],
      pathways_role: ["STUDENT", "ADMIN"],
      pathways_user_status: [
        "registered",
        "admitted_to_payment",
        "payment_uploaded",
        "active",
        "revoked",
      ],
      payment_status: [
        "NOT_PAID",
        "AWAITING_VERIFICATION",
        "VERIFYING",
        "VERIFIED",
        "REJECTED",
      ],
      recruiting_next_step: ["DIRECT_HIRING", "INTERVIEW", "ONLINE_ASSESSMENT"],
      recruiting_status: ["ACTIVE", "COMPLETED", "CANCELLED"],
      registration_status: ["PENDING", "APPROVED", "REJECTED", "ADMITTED"],
      talent_pool_role: ["ADMIN", "STUDENT", "COMPANY"],
      talent_pool_user_status: [
        "pending_review",
        "accepted_pending_payment",
        "payment_uploaded",
        "rejected",
        "active_member",
      ],
      user_role: ["ASSOCIATE", "PARTNER", "ADMIN"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
