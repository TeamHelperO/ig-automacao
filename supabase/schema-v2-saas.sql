-- =========================================================
-- MIGRAÇÃO PRA SAAS MULTI-CONTA
-- Rode isto no SQL Editor do Supabase DEPOIS do schema.sql original.
-- Adiciona: planos, perfis de usuário (super admin + plano),
-- múltiplas contas de Instagram por usuário, pagamentos.
-- =========================================================

-- ---------------------------------------------------------
-- plans: os planos disponíveis (você edita/cria pelo painel super admin)
-- ---------------------------------------------------------
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents int not null default 0,
  max_ig_accounts int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table plans enable row level security;

insert into plans (name, price_cents, max_ig_accounts)
values ('Grátis', 0, 1)
on conflict do nothing;

-- ---------------------------------------------------------
-- profiles: 1 linha por usuário (espelha auth.users), com
-- plano atual e se é super admin
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_super_admin boolean not null default false,
  plan_id uuid references plans(id),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- exceção única: o próprio usuário pode ler seu profile com a
-- chave anônima (usado pelo proxy.ts pra checar is_super_admin).
-- Todo o resto do acesso a dados continua só pela service role.
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

-- cria o profile automaticamente quando alguém se cadastra
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  select id into free_plan_id from plans where name = 'Grátis' limit 1;
  insert into public.profiles (id, email, plan_id)
  values (new.id, new.email, free_plan_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------
-- payments: histórico de pagamentos via Mercado Pago
-- ---------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references plans(id),
  mp_payment_id text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  amount_cents int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table payments enable row level security;

-- ---------------------------------------------------------
-- accounts: substitui a antiga tabela "config". Agora é 1
-- linha POR CONTA de Instagram conectada, ligada a um usuário.
-- ---------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ig_user_id text unique,
  ig_username text,
  ig_profile_picture_url text,
  access_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now()
);
alter table accounts enable row level security;

-- ---------------------------------------------------------
-- Vincula as tabelas existentes a uma conta específica
-- ---------------------------------------------------------
alter table automations add column if not exists account_id uuid references accounts(id) on delete cascade;
alter table contacts add column if not exists account_id uuid references accounts(id) on delete cascade;
alter table events add column if not exists account_id uuid references accounts(id) on delete set null;
alter table queue add column if not exists account_id uuid references accounts(id) on delete cascade;

-- o mesmo ig_scoped_id pode existir em contas diferentes, então
-- a unicidade agora é por (account_id, ig_scoped_id)
alter table contacts drop constraint if exists contacts_ig_scoped_id_key;
create unique index if not exists contacts_account_scoped_idx
  on contacts (account_id, ig_scoped_id);

-- ---------------------------------------------------------
-- Migra dados da tabela antiga "config" (se existir e tiver uma
-- conta conectada) pra "accounts", associando a um dono.
-- IMPORTANTE: troque SEU_USER_ID pelo seu próprio id depois de
-- criar sua conta de login (veja instruções no chat).
-- ---------------------------------------------------------
-- insert into accounts (user_id, ig_user_id, ig_username, ig_profile_picture_url, access_token, token_expires_at, connected_at)
-- select 'SEU_USER_ID'::uuid, ig_user_id, ig_username, ig_profile_picture_url, access_token, token_expires_at, connected_at
-- from config where id = 1 and ig_user_id is not null;
