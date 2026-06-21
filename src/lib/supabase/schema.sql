-- ============================================================
-- Silvana Financeiro - Schema SQL para Supabase
-- Execute este script no SQL Editor do Supabase Console
-- ============================================================

-- Habilitar Row Level Security (RLS) em todas as tabelas
-- Os usuários só acessam seus próprios dados

-- ============================================================
-- TABELA: movements (Movimentações Financeiras)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movements (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT          CHECK (type IN ('entrada', 'saída')) NOT NULL,
  description TEXT          NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE          NOT NULL,
  category    TEXT          NOT NULL DEFAULT 'Geral',
  created_at  TIMESTAMPTZ   DEFAULT now() NOT NULL
);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own movements"
  ON public.movements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABELA: accounts_payable (Contas a Pagar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT          NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date    DATE          NOT NULL,
  status      TEXT          CHECK (status IN ('pendente', 'pago', 'atrasado')) NOT NULL DEFAULT 'pendente',
  created_at  TIMESTAMPTZ   DEFAULT now() NOT NULL
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own accounts"
  ON public.accounts_payable
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABELA: uploads (Registros de Upload e OCR)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.uploads (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url         TEXT        NOT NULL,
  storage_path      TEXT,
  ocr_text          TEXT,
  processing_status TEXT        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own uploads"
  ON public.uploads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABELA: settings (Configurações por usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT        NOT NULL DEFAULT 'Silvana Uniformes',
  logo_url     TEXT        DEFAULT '',
  user_name    TEXT        NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON public.settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE: bucket para imagens de upload
-- ============================================================
-- Execute separadamente ou via Supabase Dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- CREATE POLICY "Users can upload their own files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own files"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own files"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_movements_user_date ON public.movements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user_due ON public.accounts_payable(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_uploads_user_created ON public.uploads(user_id, created_at DESC);
