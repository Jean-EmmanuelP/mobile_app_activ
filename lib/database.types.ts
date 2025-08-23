export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      answers: {
        Row: {
          id: number
          submission_id: string | null
          question_id: number | null
          value: string
          additional_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          submission_id?: string | null
          question_id?: number | null
          value: string
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          submission_id?: string | null
          question_id?: number | null
          value?: string
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      questions: {
        Row: {
          id: number
          section_id: number | null
          parent_id: number | null
          text: string
          type: string
          options: Json | null
          condition: Json | null
          order_index: number | null
          is_required: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          section_id?: number | null
          parent_id?: number | null
          text: string
          type: string
          options?: Json | null
          condition?: Json | null
          order_index?: number | null
          is_required?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          section_id?: number | null
          parent_id?: number | null
          text?: string
          type?: string
          options?: Json | null
          condition?: Json | null
          order_index?: number | null
          is_required?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sections: {
        Row: {
          id: number
          name: string
          description: string | null
          order_index: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          order_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          order_index?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      submissions: {
        Row: {
          id: string
          secure_key: string | null
          patient_info: Json | null
          status: string | null
          submitted_by_user_id: number | null
          submission_count: number | null
          locked_by_user_id: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          secure_key?: string | null
          patient_info?: Json | null
          status?: string | null
          submitted_by_user_id?: number | null
          submission_count?: number | null
          locked_by_user_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          secure_key?: string | null
          patient_info?: Json | null
          status?: string | null
          submitted_by_user_id?: number | null
          submission_count?: number | null
          locked_by_user_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: number
          email: string
          role: string | null
          first_name: string | null
          last_name: string | null
          signature: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          email: string
          role?: string | null
          first_name?: string | null
          last_name?: string | null
          signature?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          email?: string
          role?: string | null
          first_name?: string | null
          last_name?: string | null
          signature?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      llm_responses: {
        Row: {
          id: string
          submission_id: string | null
          rag_used: Json | null
          response_content: Json
          generated_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          submission_id?: string | null
          rag_used?: Json | null
          response_content: Json
          generated_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          submission_id?: string | null
          rag_used?: Json | null
          response_content?: Json
          generated_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Question = Database['public']['Tables']['questions']['Row'];
export type Answer = Database['public']['Tables']['answers']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type Section = Database['public']['Tables']['sections']['Row'];
export type User = Database['public']['Tables']['users']['Row'];