export type UserRole = "platform_admin" | "studio_owner" | "studio_staff";

export type UserApprovalStatus = "pending" | "approved" | "denied";

export type LeadStage =
  | "new"
  | "no_response"
  | "follow_up_1"
  | "follow_up_2"
  | "customer"
  | "return_7_days"
  | "inactive_30_days"
  | "birthday_month";

export type ChannelType =
  | "whatsapp"
  | "instagram"
  | "site"
  | "form"
  | "manual";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";

export type ChecklistStatus = "pending" | "in_progress" | "done";

export type ChecklistCategory =
  | "Instagram"
  | "Google"
  | "Atendimento"
  | "Conteudo"
  | "CRM"
  | "Trafego"
  | "Conversao";

export type Studio = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "trial" | "paused" | "cancelled";
  created_at: string;
};

export type Lead = {
  id: string;
  studio_id: string;
  customer_id?: string | null;
  name: string;
  phone?: string | null;
  instagram?: string | null;
  source?: string | null;
  initial_message?: string | null;
  current_stage: LeadStage;
  owner_id?: string | null;
  created_at: string;
  last_interaction_at?: string | null;
  next_follow_up_at?: string | null;
  status: "open" | "converted" | "lost" | "archived";
  notes?: string | null;
};

export type Customer = {
  id: string;
  studio_id: string;
  name: string;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
  birth_date?: string | null;
  first_visit_at?: string | null;
  last_visit_at?: string | null;
  next_visit_at?: string | null;
  source?: string | null;
  tags: string[];
  status: "active" | "inactive" | "blocked";
  notes?: string | null;
  appointment_count: number;
  lifetime_value?: number | null;
};

export type Appointment = {
  id: string;
  studio_id: string;
  customer_id?: string | null;
  lead_id?: string | null;
  title: string;
  procedure?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  professional_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type Sale = {
  id: string;
  studio_id: string;
  customer_id?: string | null;
  sale_date: string;
  amount: number;
  description?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type ChecklistTemplate = {
  id: string;
  month_number: 1 | 2 | 3;
  suggested_week: 1 | 2 | 3 | 4;
  title: string;
  description?: string | null;
  category: ChecklistCategory;
  points: 5 | 10 | 20;
};
