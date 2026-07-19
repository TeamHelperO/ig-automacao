# Automação de Instagram (comentário vira DM)

Projeto Next.js + Supabase + API do Instagram. Veja o passo a passo completo
que a Claude vai te dar na conversa — este README é só um resumo rápido.

## Rodar localmente
```
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

## Banco
Rode `supabase/schema.sql` no SQL Editor do seu projeto Supabase (uma vez).
Antes disso, edite as duas linhas com `SEU_APP.vercel.app` e `SEU_CRON_SECRET`
no final do arquivo.

## Deploy
Suba este repositório no GitHub e importe na Vercel. Configure as mesmas
variáveis de ambiente do `.env.example` no painel da Vercel.
