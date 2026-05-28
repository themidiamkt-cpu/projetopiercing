# Estudio lucrativo

SaaS multiempresa para estudios de body piercing, tatuagem e estetica. O MVP 1 cobre CRM Kanban, leads, clientes, calendario base e webhook seguro para n8n com Supabase.

## Stack

- Next.js, React, TypeScript
- Tailwind CSS
- Supabase Auth, Postgres e RLS
- n8n via `POST /api/webhooks/inbound-message`
- Vercel

## Arquivos Principais

- `supabase/schema.sql`: tabelas, enums, indices, funcoes, triggers e RLS.
- `supabase/seeds/crm_stages.sql`: seed das fases do Kanban.
- `supabase/seeds/checklist_templates.sql`: seed do Plano de Crescimento de 3 meses.
- `src/types/domain.ts`: tipos principais.
- `src/app/api/webhooks/inbound-message/route.ts`: webhook do n8n.
- `docs/architecture.md`: arquitetura, fluxos e roadmap do MVP.

## Rodar Localmente

```bash
cp .env.example .env.local
npm run dev
```

Preencha as chaves do Supabase antes de testar rotas conectadas ao banco.

## Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/schema.sql` no SQL editor.
3. Execute os seeds em `supabase/seeds`.
4. Crie usuarios no Supabase Auth.
5. Insira `profiles`, `studios` e `studio_members` para liberar acesso por RLS.

## n8n

Envie eventos para:

```http
POST /api/webhooks/inbound-message
x-studio-api-key: <studios.inbound_api_key>
```

Payload:

```json
{
  "studio_id": "uuid-do-studio",
  "name": "Marina Lopes",
  "phone": "+5511999990001",
  "instagram": "@marilopes",
  "message": "Quero saber valor de piercing no tragus",
  "source": "Instagram",
  "channel": "instagram",
  "external_timestamp": "2026-05-25T12:10:00.000Z"
}
```

## Getting Started

## Next.js

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
