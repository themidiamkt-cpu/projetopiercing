import type { Appointment, ChecklistTemplate, Lead, LeadStage } from "@/types/domain";

export const crmStages: Array<{ id: LeadStage; title: string; description: string }> = [
  { id: "new", title: "Novo", description: "Entradas do WhatsApp e cadastros manuais" },
  { id: "no_response", title: "Nao respondeu", description: "Sem retorno apos contato" },
  { id: "follow_up_1", title: "Follow-up 1", description: "Primeira retomada manual" },
  { id: "follow_up_2", title: "Follow-up 2", description: "Segunda retomada manual" },
  { id: "customer", title: "Cliente", description: "Convertidos com cadastro completo" },
  { id: "return_7_days", title: "Retorno 7 dias", description: "Cuidados e revisao" },
  { id: "inactive_30_days", title: "Cliente 30 dias sem vir", description: "Reativacao comercial" },
  { id: "birthday_month", title: "Aniversariantes do mes", description: "Relacionamento do mes" },
];

export const leads: Lead[] = [
  {
    id: "lead-1",
    studio_id: "studio-demo",
    name: "Marina Lopes",
    phone: "+5511999990001",
    instagram: "@marilopes",
    source: "Instagram",
    initial_message: "Quero saber valor de piercing no tragus",
    current_stage: "new",
    created_at: "2026-05-24T12:10:00.000Z",
    last_interaction_at: "2026-05-24T12:10:00.000Z",
    next_follow_up_at: "2026-05-25T12:10:00.000Z",
    status: "open",
    notes: "Perguntou sobre joia em titanio.",
  },
  {
    id: "lead-2",
    studio_id: "studio-demo",
    name: "Bianca Neri",
    phone: "+5511999990002",
    instagram: "@binrx",
    source: "WhatsApp",
    initial_message: "Tem horario essa semana?",
    current_stage: "follow_up_1",
    created_at: "2026-05-22T09:30:00.000Z",
    last_interaction_at: "2026-05-22T13:00:00.000Z",
    next_follow_up_at: "2026-05-25T10:00:00.000Z",
    status: "open",
  },
  {
    id: "lead-3",
    studio_id: "studio-demo",
    name: "Camila Torres",
    phone: "+5511999990003",
    instagram: "@camitorres",
    source: "Formulario",
    initial_message: "Gostaria de agendar nostril",
    current_stage: "customer",
    created_at: "2026-05-18T15:20:00.000Z",
    last_interaction_at: "2026-05-20T15:00:00.000Z",
    status: "converted",
  },
];

export const appointments: Appointment[] = [
  {
    id: "appt-1",
    studio_id: "studio-demo",
    customer_id: "customer-1",
    lead_id: "lead-3",
    title: "Camila Torres",
    procedure: "Nostril",
    start_time: "2026-05-25T14:00:00.000Z",
    end_time: "2026-05-25T15:00:00.000Z",
    status: "scheduled",
    notes: "Confirmar cuidados e documento.",
  },
  {
    id: "appt-2",
    studio_id: "studio-demo",
    customer_id: "customer-2",
    title: "Juliana Prado",
    procedure: "Troca de joia",
    start_time: "2026-05-25T17:00:00.000Z",
    end_time: "2026-05-25T17:30:00.000Z",
    status: "confirmed",
  },
];

export const checklistPreview: ChecklistTemplate[] = [
  { id: "m1-1", month_number: 1, suggested_week: 1, title: "Ajustar bio do Instagram", category: "Instagram", points: 10 },
  { id: "m1-2", month_number: 1, suggested_week: 1, title: "Criar destaque de avaliacoes", category: "Instagram", points: 10 },
  { id: "m1-3", month_number: 1, suggested_week: 2, title: "Otimizar Google Meu Negocio", category: "Google", points: 20 },
  { id: "m2-1", month_number: 2, suggested_week: 1, title: "Publicar 3 conteudos por semana", category: "Conteudo", points: 20 },
  { id: "m3-1", month_number: 3, suggested_week: 2, title: "Medir taxa de fechamento", category: "Conversao", points: 20 },
];
