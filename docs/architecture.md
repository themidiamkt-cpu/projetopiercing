# Arquitetura Inicial

## Estrutura De Pastas

- `src/app`: App Router do Next.js, paginas e API routes.
- `src/app/api/webhooks/inbound-message`: entrada segura do n8n.
- `src/components/layout`: `AppShell` e navegacao lateral.
- `src/components/dashboard`: cards e graficos iniciais.
- `src/components/crm`: kanban e card de lead.
- `src/components/customers`: formulario usado na conversao para cliente.
- `src/components/calendar`: calendario visual base.
- `src/components/growth`: Plano de Crescimento e pontuacao.
- `src/components/reports`: CTA e relatorios.
- `src/lib/supabase`: clients browser e service role.
- `src/types`: tipos TypeScript principais.
- `supabase`: schema, RLS, funcoes e seeds.

## Fluxos De Telas

1. Login via Supabase Auth.
2. Selecao ou resolucao do `studio_id` pelo membership do usuario.
3. Dashboard mostra metricas operacionais, tarefas e proximos agendamentos.
4. CRM recebe leads do n8n em `Novo`.
5. Usuario move card entre fases.
6. Ao mover para `Cliente`, abre formulario obrigatorio.
7. Formulario cria ou atualiza `customers`, vincula `lead.customer_id`, marca lead como convertido e cria `appointments` se houver data.
8. Calendario permite criar, editar e futuramente arrastar agendamentos.

## Automacoes

- n8n envia `POST /api/webhooks/inbound-message` com `x-studio-api-key`.
- Endpoint valida studio, payload e deduplicacao por telefone ou Instagram no mesmo `studio_id`.
- Agendamento `completed` cria tarefa de retorno em 7 dias.
- Cron do Supabase pode chamar `create_inactive_30_day_tasks()` diariamente.
- Cron mensal ou diario pode chamar `create_birthday_month_tasks()`.
- Follow-ups sao tarefas internas, sem envio automatico de mensagem no MVP.

## MVP

### MVP 1
- Auth, studios, memberships e RLS.
- CRM Kanban.
- Webhook n8n.
- Leads e clientes.
- Conversao de lead para cliente.
- Calendario basico.

### MVP 2
- Plano de Crescimento.
- Checklists mensais/semanais.
- Pontuacao de execucao.
- Relatorios simples.

### MVP 3
- Automacoes pos-cliente.
- Retorno 7 dias.
- Cliente 30 dias sem vir.
- Aniversariantes do mes.
- Prontidao para trafego e CTA de agencia.
