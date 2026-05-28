import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Appointment, ChecklistTemplate, Customer, Lead, Sale } from "@/types/domain";

export type AppContext = {
  studioId: string;
  studioName: string;
  studioSlug: string;
  studioCreatedAt?: string;
  growthPlanStartDate?: string | null;
  inboundApiKey?: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
};

export type StudioOverview = AppContext & {
  leads: Lead[];
  appointments: Appointment[];
  tasks: TaskRow[];
  sales: Sale[];
  growthItems: GrowthItem[];
};

export type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  status: string;
  type: string;
};

export type GrowthItem = ChecklistTemplate & {
  progress_id?: string | null;
  checklist_item_id?: string | null;
  status: "pending" | "in_progress" | "done";
  completed_at?: string | null;
  evidence_text?: string | null;
  notes?: string | null;
};

export type ReportData = {
  leads: Lead[];
  customers: Customer[];
  appointments: Appointment[];
  tasks: TaskRow[];
  growthItems: GrowthItem[];
  sales: Sale[];
  agencyInterestCount: number;
};

export async function getAppContext(): Promise<AppContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,email")
    .eq("id", user.id)
    .single();

  let studioQuery = supabase
    .from("studios")
    .select("id,name,slug,inbound_api_key,created_at,growth_plan_start_date")
    .order("created_at", { ascending: true })
    .limit(1);

  if (profile?.role !== "platform_admin") {
    const { data: membership } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership?.studio_id) {
      redirect("/login?error=Usuario sem estudio vinculado");
    }

    studioQuery = supabase
      .from("studios")
      .select("id,name,slug,inbound_api_key,created_at,growth_plan_start_date")
      .eq("id", membership.studio_id)
      .limit(1);
  }

  const { data: studioData, error: studioError } = await studioQuery.single();
  let studio = studioData;

  if (studioError?.message?.includes("growth_plan_start_date")) {
    let fallbackQuery = supabase
      .from("studios")
      .select("id,name,slug,inbound_api_key,created_at")
      .order("created_at", { ascending: true })
      .limit(1);

    if (profile?.role !== "platform_admin") {
      const { data: membership } = await supabase
        .from("studio_members")
        .select("studio_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      fallbackQuery = supabase
        .from("studios")
        .select("id,name,slug,inbound_api_key,created_at")
        .eq("id", membership?.studio_id)
        .limit(1);
    }

    const fallback = await fallbackQuery.single();
    studio = fallback.data ? { ...fallback.data, growth_plan_start_date: null } : null;
  }

  if (!studio) {
    redirect("/login?error=Nenhum estudio disponivel");
  }

  return {
    studioId: studio.id,
    studioName: studio.name,
    studioSlug: studio.slug,
    studioCreatedAt: studio.created_at,
    growthPlanStartDate: studio.growth_plan_start_date,
    inboundApiKey: studio.inbound_api_key,
    userId: user.id,
    userEmail: user.email,
    userRole: profile?.role,
  };
}

export async function getStudioOverview(): Promise<StudioOverview> {
  const context = await getAppContext();
  await syncStudioAutomations(context.studioId);

  const [leads, appointments, tasks, sales, growthItems] = await Promise.all([
    getLeads(context.studioId, { skipSync: true }),
    getAppointments(context.studioId),
    getTasks(context.studioId),
    getSales(context.studioId),
    getGrowthItems(context.studioId),
  ]);

  return { ...context, leads, appointments, tasks, sales, growthItems };
}

export async function getLeads(studioId: string, options?: { skipSync?: boolean }): Promise<Lead[]> {
  const supabase = await createServerSupabaseClient();
  if (!options?.skipSync) {
    await syncStudioAutomations(studioId);
  }

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  return dedupeAutomaticLeads((data ?? []) as Lead[]);
}

async function syncStudioAutomations(studioId: string) {
  await Promise.all([
    syncReturn7Days(studioId),
    syncInactive30Days(studioId),
    syncBirthdayMonthLeads(studioId),
  ]);
}

async function syncReturn7Days(studioId: string) {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id,customer_id,title,procedure,start_time")
    .eq("studio_id", studioId)
    .eq("status", "completed")
    .not("customer_id", "is", null)
    .order("start_time", { ascending: false })
    .limit(200);

  if (!appointments?.length) {
    return;
  }

  const appointmentIds = appointments.map((appointment) => appointment.id);
  const customerIds = appointments
    .map((appointment) => appointment.customer_id)
    .filter((customerId): customerId is string => Boolean(customerId));

  const [{ data: existingTasks }, { data: existingLeads }, { data: customers }] = await Promise.all([
    supabase
      .from("tasks")
      .select("appointment_id")
      .eq("studio_id", studioId)
      .eq("type", "return_7_days")
      .in("appointment_id", appointmentIds),
    supabase
      .from("leads")
      .select("customer_id")
      .eq("studio_id", studioId)
      .eq("current_stage", "return_7_days")
      .in("customer_id", customerIds)
      .neq("status", "archived"),
    supabase
      .from("customers")
      .select("id,name,phone,instagram,source,notes")
      .eq("studio_id", studioId)
      .in("id", customerIds),
  ]);

  const taskAppointmentIds = new Set((existingTasks ?? []).map((task) => task.appointment_id));
  const leadCustomerIds = new Set((existingLeads ?? []).map((lead) => lead.customer_id));
  const customersById = new Map((customers ?? []).map((customer) => [customer.id, customer]));

  const tasksToInsert = appointments
    .filter((appointment) => appointment.customer_id && !taskAppointmentIds.has(appointment.id))
    .map((appointment) => ({
      studio_id: studioId,
      customer_id: appointment.customer_id,
      appointment_id: appointment.id,
      title: "Retorno de 7 dias",
      description: "Conferir cicatrizacao, orientar cuidados e registrar relacionamento.",
      due_at: new Date(new Date(appointment.start_time).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: "return_7_days",
    }));

  if (tasksToInsert.length) {
    await supabase.from("tasks").insert(tasksToInsert);
  }

  const leadsToInsert = appointments
    .filter((appointment) => appointment.customer_id && !leadCustomerIds.has(appointment.customer_id))
    .map((appointment) => {
      const customer = appointment.customer_id ? customersById.get(appointment.customer_id) : null;

      return {
        studio_id: studioId,
        customer_id: appointment.customer_id,
        name: customer?.name ?? appointment.title,
        phone: customer?.phone ?? null,
        instagram: customer?.instagram ?? null,
        source: "Retorno 7 dias",
        initial_message: `Retorno de 7 dias - ${appointment.procedure ?? appointment.title}`,
        current_stage: "return_7_days",
        last_interaction_at: now.toISOString(),
        status: "open",
        notes: customer?.notes ?? null,
      };
    });

  if (leadsToInsert.length) {
    await supabase.from("leads").insert(leadsToInsert);
  }
}

async function syncInactive30Days(studioId: string) {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,phone,instagram,last_visit_at,source,notes")
    .eq("studio_id", studioId)
    .not("last_visit_at", "is", null)
    .lt("last_visit_at", limit.toISOString())
    .eq("status", "active")
    .limit(500);

  if (!customers?.length) {
    return;
  }

  const customerIds = customers.map((customer) => customer.id);
  const [{ data: newerAppointments }, { data: existingTasks }, { data: existingLeads }] = await Promise.all([
    supabase
      .from("appointments")
      .select("customer_id,start_time")
      .eq("studio_id", studioId)
      .in("customer_id", customerIds)
      .in("status", ["scheduled", "confirmed", "completed"]),
    supabase
      .from("tasks")
      .select("customer_id")
      .eq("studio_id", studioId)
      .eq("type", "inactive_30_days")
      .in("customer_id", customerIds)
      .neq("status", "cancelled"),
    supabase
      .from("leads")
      .select("customer_id")
      .eq("studio_id", studioId)
      .eq("current_stage", "inactive_30_days")
      .in("customer_id", customerIds)
      .neq("status", "archived"),
  ]);

  const customersWithNewerAppointment = new Set(
    (newerAppointments ?? [])
      .filter((appointment) => {
        const customer = customers.find((item) => item.id === appointment.customer_id);
        return customer?.last_visit_at && new Date(appointment.start_time) > new Date(customer.last_visit_at);
      })
      .map((appointment) => appointment.customer_id),
  );
  const taskCustomerIds = new Set((existingTasks ?? []).map((task) => task.customer_id));
  const leadCustomerIds = new Set((existingLeads ?? []).map((lead) => lead.customer_id));
  const eligibleCustomers = customers.filter((customer) => !customersWithNewerAppointment.has(customer.id));

  const tasksToInsert = eligibleCustomers
    .filter((customer) => !taskCustomerIds.has(customer.id))
    .map((customer) => ({
      studio_id: studioId,
      customer_id: customer.id,
      title: "Cliente 30 dias sem vir",
      description: "Criar contato de reativacao e registrar proximo passo.",
      due_at: now.toISOString(),
      type: "inactive_30_days",
    }));

  if (tasksToInsert.length) {
    await supabase.from("tasks").insert(tasksToInsert);
  }

  const leadsToInsert = eligibleCustomers
    .filter((customer) => !leadCustomerIds.has(customer.id))
    .map((customer) => ({
      studio_id: studioId,
      customer_id: customer.id,
      name: customer.name,
      phone: customer.phone,
      instagram: customer.instagram,
      source: "30 dias sem vir",
      initial_message: "Cliente ha 30 dias sem retorno registrado.",
      current_stage: "inactive_30_days",
      last_interaction_at: now.toISOString(),
      status: "open",
      notes: customer.notes,
    }));

  if (leadsToInsert.length) {
    await supabase.from("leads").insert(leadsToInsert);
  }
}

async function syncBirthdayMonthLeads(studioId: string) {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: customers }, { data: existingBirthdayLeads }, { data: existingBirthdayTasks }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,instagram,birth_date,source,notes")
      .eq("studio_id", studioId)
      .not("birth_date", "is", null),
    supabase
      .from("leads")
      .select("customer_id")
      .eq("studio_id", studioId)
      .eq("source", "Aniversario")
      .gte("created_at", monthStart),
    supabase
      .from("tasks")
      .select("customer_id")
      .eq("studio_id", studioId)
      .eq("type", "birthday_month")
      .gte("created_at", monthStart)
      .neq("status", "cancelled"),
  ]);

  const existingCustomerIds = new Set(
    (existingBirthdayLeads ?? [])
      .map((lead) => lead.customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  );
  const birthdayCustomers = (customers ?? []).filter((customer) => {
    if (!customer.birth_date || existingCustomerIds.has(customer.id)) {
      return false;
    }

    const [, month] = customer.birth_date.split("-").map(Number);
    return month === currentMonth;
  });

  if (!birthdayCustomers.length) {
    return;
  }

  const leadPayload = birthdayCustomers.map((customer) => ({
      studio_id: studioId,
      customer_id: customer.id,
      name: customer.name,
      phone: customer.phone,
      instagram: customer.instagram,
      source: "Aniversario",
      initial_message: `Aniversariante do mes - ${formatBirthDate(customer.birth_date)}`,
      current_stage: "birthday_month",
      last_interaction_at: now.toISOString(),
      status: "open",
      notes: customer.notes,
  }));
  const existingTaskCustomerIds = new Set(
    (existingBirthdayTasks ?? [])
      .map((task) => task.customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  );
  const taskPayload = birthdayCustomers
    .filter((customer) => !existingTaskCustomerIds.has(customer.id))
    .map((customer) => ({
      studio_id: studioId,
      customer_id: customer.id,
      title: "Aniversariante do mes",
      description: "Registrar acao de relacionamento no mes do aniversario.",
      due_at: new Date(now.getFullYear(), now.getMonth() + 1, 0, 12).toISOString(),
      type: "birthday_month",
    }));

  await supabase.from("leads").insert(leadPayload);
  if (taskPayload.length) {
    await supabase.from("tasks").insert(taskPayload);
  }
}

function dedupeAutomaticLeads(leads: Lead[]) {
  const seenAutomaticCustomers = new Set<string>();
  const automaticSources = new Set(["Aniversario", "30 dias sem vir", "Retorno 7 dias"]);

  return leads.filter((lead) => {
    if (!lead.source || !automaticSources.has(lead.source) || !lead.customer_id) {
      return true;
    }

    const key = `${lead.source}:${lead.customer_id}`;

    if (seenAutomaticCustomers.has(key)) {
      return false;
    }

    seenAutomaticCustomers.add(key);
    return true;
  });
}

function formatBirthDate(birthDate?: string | null) {
  if (!birthDate) {
    return "";
  }

  const [, month, day] = birthDate.split("-");
  return `${day}/${month}`;
}

export async function getCustomers(studioId: string): Promise<Customer[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("studio_id", studioId)
    .order("name", { ascending: true });

  return (data ?? []) as Customer[];
}

export async function getAppointments(studioId: string): Promise<Appointment[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("studio_id", studioId)
    .order("start_time", { ascending: true });

  return (data ?? []) as Appointment[];
}

export async function getTasks(studioId: string): Promise<TaskRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,due_at,status,type")
    .eq("studio_id", studioId)
    .neq("status", "done")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(10);

  return (data ?? []) as TaskRow[];
}

export async function getSales(studioId: string): Promise<Sale[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("sales")
    .select("*")
    .eq("studio_id", studioId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as Sale[];
}

export async function getGrowthItems(studioId: string): Promise<GrowthItem[]> {
  const supabase = await createServerSupabaseClient();
  const [{ data: templates }, { data: items }, { data: progress }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("*")
      .order("month_number", { ascending: true })
      .order("suggested_week", { ascending: true }),
    supabase.from("checklist_items").select("*").eq("studio_id", studioId),
    supabase.from("studio_checklist_progress").select("*").eq("studio_id", studioId),
  ]);

  const itemsByTemplate = new Map((items ?? []).map((item) => [item.template_id, item]));
  const progressByItem = new Map((progress ?? []).map((item) => [item.checklist_item_id, item]));

  return ((templates ?? []) as ChecklistTemplate[]).map((template) => {
    const checklistItem = itemsByTemplate.get(template.id);
    const progressItem = checklistItem ? progressByItem.get(checklistItem.id) : null;

    return {
      ...template,
      checklist_item_id: checklistItem?.id ?? null,
      progress_id: progressItem?.id ?? null,
      status: progressItem?.status ?? "pending",
      completed_at: progressItem?.completed_at ?? null,
      evidence_text: progressItem?.evidence_text ?? null,
      notes: progressItem?.notes ?? null,
    };
  });
}

export async function getReportData(studioId: string): Promise<ReportData> {
  const supabase = await createServerSupabaseClient();
  await syncStudioAutomations(studioId);

  const [leads, customers, appointments, tasks, growthItems, sales, agencyInterest] = await Promise.all([
    getLeads(studioId, { skipSync: true }),
    getCustomers(studioId),
    getAppointments(studioId),
    getTasks(studioId),
    getGrowthItems(studioId),
    getSales(studioId),
    supabase.from("agency_interest").select("id", { count: "exact", head: true }).eq("studio_id", studioId),
  ]);

  return {
    leads,
    customers,
    appointments,
    tasks,
    growthItems,
    sales,
    agencyInterestCount: agencyInterest.count ?? 0,
  };
}
