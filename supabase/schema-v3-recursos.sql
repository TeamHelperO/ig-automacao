-- =========================================================
-- MIGRAÇÃO: recursos novos (menção, cliques, colaboradores, sequência)
-- Rode isto no SQL Editor do Supabase DEPOIS do schema-v2-saas.sql
-- =========================================================

-- gatilho de menção (story/post marcando sua conta)
alter table automations add column if not exists trigger_mention boolean not null default false;

-- ---------------------------------------------------------
-- link_clicks: links rastreáveis (seu-app.vercel.app/l/xxxxx)
-- que registram o clique antes de redirecionar pro destino real
-- ---------------------------------------------------------
create table if not exists link_clicks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  contact_id uuid references contacts(id) on delete cascade,
  code text unique not null,
  destination_url text not null,
  created_at timestamptz not null default now(),
  clicked_at timestamptz
);
alter table link_clicks enable row level security;
create index if not exists link_clicks_code_idx on link_clicks (code);

-- ---------------------------------------------------------
-- account_collaborators: outras pessoas (da sua equipe) com
-- acesso de gestão a uma conta que você conectou
-- ---------------------------------------------------------
create table if not exists account_collaborators (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);
alter table account_collaborators enable row level security;

-- ---------------------------------------------------------
-- followups: agora vira uma sequência de passos configurável
-- (além do link + lembrete simples que já existiam na automação)
-- ---------------------------------------------------------
alter table followups add column if not exists step_order int not null default 0;
alter table followups add column if not exists message_text text;
alter table followups add column if not exists link_url text;
alter table followups add column if not exists link_button_label text;
alter table followups alter column step drop not null;
alter table followups drop constraint if exists followups_step_check;
