-- =========================================================
-- Schema do app de automação de Instagram
-- Rode isto no SQL Editor do Supabase (projeto novo, uma vez).
-- Todas as tabelas têm RLS ligado e SEM políticas: só a
-- service role key (usada apenas no servidor) consegue acessar.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- config: 1 única linha com os dados da conta conectada
-- ---------------------------------------------------------
create table if not exists config (
  id int primary key default 1,
  ig_user_id text,
  ig_username text,
  ig_profile_picture_url text,
  access_token text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  constraint config_singleton check (id = 1)
);
alter table config enable row level security;

-- ---------------------------------------------------------
-- automations: as regras "comentou/respondeu story/mandou dm
-- com palavra X" -> "manda isso"
-- ---------------------------------------------------------
create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  active boolean not null default true,

  -- gatilhos: quais eventos essa automação escuta
  trigger_comment boolean not null default true,
  trigger_story_reply boolean not null default false,
  trigger_dm boolean not null default false,

  -- palavras-chave e regra de casamento
  keywords text[] not null default '{}',
  match_type text not null default 'contains'
    check (match_type in ('contains', 'exact', 'any')),

  -- restringe a um post/reel específico (media id da Graph API); nulo = todos
  target_media_id text,

  -- respostas públicas no comentário (sorteia entre as variações)
  public_replies text[] not null default '{}',

  -- DM de boas-vindas
  welcome_dm_text text,
  quick_reply_label text,       -- texto do botão de resposta rápida

  -- link enviado no follow-up
  link_text text,
  link_button_label text,
  link_url text,

  -- lembrete
  reminder_text text,
  reminder_delay_minutes int not null default 60
);
alter table automations enable row level security;

-- ---------------------------------------------------------
-- followups: passos de envio derivados de uma automação,
-- disparados quando a janela de 24h abre (pessoa responde)
-- ---------------------------------------------------------
create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  step text not null check (step in ('link', 'reminder')),
  delay_minutes int not null default 0,
  created_at timestamptz not null default now()
);
alter table followups enable row level security;

-- ---------------------------------------------------------
-- contacts: uma linha por pessoa que já interagiu
-- ---------------------------------------------------------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  ig_scoped_id text not null unique,  -- id da pessoa (escopo do app)
  username text,
  first_contact_at timestamptz not null default now(),
  last_response_at timestamptz,       -- última vez que ELA respondeu (abre janela 24h)
  last_automation_id uuid references automations(id)
);
alter table contacts enable row level security;

-- ---------------------------------------------------------
-- queue: fila de envio com trava atômica
-- ---------------------------------------------------------
create table if not exists queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  send_after timestamptz not null default now(),

  contact_id uuid not null references contacts(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,

  kind text not null check (kind in ('private_reply', 'public_reply', 'dm', 'link', 'reminder')),
  recipient_type text not null check (recipient_type in ('id', 'comment_id')),
  recipient_value text not null,      -- o id ou comment_id em si
  payload jsonb not null default '{}', -- texto/botão a enviar

  -- controle da janela de 24h: até quando esse envio ainda é válido
  window_expires_at timestamptz,

  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','skipped')),
  claimed_at timestamptz,
  sent_at timestamptz,
  error text,
  attempts int not null default 0
);
alter table queue enable row level security;

create index if not exists queue_pending_idx
  on queue (status, send_after)
  where status = 'pending';

-- ---------------------------------------------------------
-- events: log bruto de tudo que chegou pelo webhook
-- ---------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type text not null,     -- 'comment' | 'message' | 'story_reply'
  raw jsonb not null,
  processed boolean not null default false,
  note text
);
alter table events enable row level security;

-- =========================================================
-- MOTOR SEM CUSTO: pg_cron + pg_net batendo nos endpoints
-- do próprio app. Ajuste a URL depois de saber o domínio
-- da Vercel e troque SEU_CRON_SECRET pelo valor que você
-- colocou na variável de ambiente CRON_SECRET.
-- =========================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- drena a fila a cada minuto (garante entrega mesmo se o
-- disparo via webhook falhar ou não acontecer)
select cron.schedule(
  'drain-queue-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_APP.vercel.app/api/cron/drain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'SEU_CRON_SECRET'
    )
  );
  $$
);

-- renova o token de acesso 1x por semana (token longo dura 60 dias)
select cron.schedule(
  'refresh-ig-token-weekly',
  '0 3 * * 1', -- toda segunda às 03:00 UTC
  $$
  select net.http_post(
    url := 'https://SEU_APP.vercel.app/api/cron/refresh-token',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'SEU_CRON_SECRET'
    )
  );
  $$
);
