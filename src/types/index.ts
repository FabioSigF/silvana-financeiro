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
