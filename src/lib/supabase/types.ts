// Tipos gerados manualmente do schema do Supabase
// Para regerar automaticamente: npx supabase gen types typescript --project-id <seu-project-id>

export type Database = {
  public: {
    Tables: {
      movements: {
        Row: {
          id: string;
          user_id: string;
          type: "entrada" | "saída";
          description: string;
          amount: number;
          date: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "entrada" | "saída";
          description: string;
          amount: number;
          date: string;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "entrada" | "saída";
          description?: string;
          amount?: number;
          date?: string;
          category?: string;
          created_at?: string;
        };
      };
      accounts_payable: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          amount: number;
          due_date: string;
          status: "pendente" | "pago" | "atrasado";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          amount: number;
          due_date: string;
          status: "pendente" | "pago" | "atrasado";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          amount?: number;
          due_date?: string;
          status?: "pendente" | "pago" | "atrasado";
          created_at?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          storage_path: string | null;
          ocr_text: string | null;
          processing_status: "pending" | "processing" | "completed" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          storage_path?: string | null;
          ocr_text?: string | null;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_url?: string;
          storage_path?: string | null;
          ocr_text?: string | null;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          logo_url: string | null;
          user_name: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string;
          logo_url?: string | null;
          user_name?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          logo_url?: string | null;
          user_name?: string;
          updated_at?: string;
        };
      };
    };
  };
};
