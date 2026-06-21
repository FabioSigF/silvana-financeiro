export type MovementType = 'entrada' | 'saída';

export interface Movement {
  id: string;
  type: MovementType;
  description: string;
  amount: number;
  date: string;
  category: string;
  created_at: string;
  created_by?: string;
}

export type AccountStatus = 'pendente' | 'pago' | 'atrasado';

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: AccountStatus;
  created_at: string;
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface UploadRecord {
  id: string;
  image_url: string;
  ocr_text?: string;
  processing_status: UploadStatus;
  created_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  color?: string | null;
  active: boolean;
  created_at: string;
}

export interface RecurringAccount {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category_id?: string | null;
  day_of_month: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
