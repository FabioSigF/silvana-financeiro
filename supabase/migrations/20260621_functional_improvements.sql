-- ============================================================
-- Migration: Categorias e Contas Recorrentes
-- Silvana Financeiro
-- ============================================================

-- 1. Tabela de Categorias
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text default '#64748B', -- cor padrão slate
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint categories_name_user_unique unique (user_id, name)
);

-- Habilita RLS para Categorias
alter table categories enable row level security;

-- Políticas de Segurança (RLS) para Categorias
create policy "Usuários podem ler suas categorias ou categorias globais"
  on categories for select
  using (user_id = auth.uid() or user_id is null);

create policy "Usuários podem criar suas próprias categorias"
  on categories for insert
  with check (user_id = auth.uid());

create policy "Usuários podem atualizar suas próprias categorias"
  on categories for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Usuários podem deletar suas próprias categorias"
  on categories for delete
  using (user_id = auth.uid());

-- Insere as categorias padrão do sistema (como globais, user_id = null)
insert into categories (name, color, user_id) values
  ('Material', '#3B82F6', null),     -- Azul
  ('Vendas', '#10B981', null),       -- Esmeralda
  ('Transporte', '#F59E0B', null),   -- Âmbar
  ('Outros', '#64748B', null)        -- Slate
on conflict (user_id, name) do nothing;


-- 2. Tabela de Contas Recorrentes (Recurring Accounts)
create table if not exists recurring_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  day_of_month integer not null check (day_of_month >= 1 and day_of_month <= 31),
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilita RLS para Contas Recorrentes
alter table recurring_accounts enable row level security;

-- Políticas de Segurança (RLS) para Contas Recorrentes
create policy "Usuários podem ler suas próprias contas recorrentes"
  on recurring_accounts for select
  using (user_id = auth.uid());

create policy "Usuários podem criar suas próprias contas recorrentes"
  on recurring_accounts for insert
  with check (user_id = auth.uid());

create policy "Usuários podem atualizar suas próprias contas recorrentes"
  on recurring_accounts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Usuários podem deletar suas próprias contas recorrentes"
  on recurring_accounts for delete
  using (user_id = auth.uid());
