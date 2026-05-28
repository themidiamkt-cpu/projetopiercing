"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/supabase/queries";
import type { LeadStage } from "@/types/domain";

const crmPaths = ["/", "/crm", "/clientes", "/calendario", "/vendas", "/plano", "/relatorios", "/configuracoes"];

function revalidateApp() {
  crmPaths.forEach((path) => revalidatePath(path));
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.length ? text : null;
}

export async function createLead(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();

  await supabase.from("leads").insert({
    studio_id: context.studioId,
    name: value(formData, "name"),
    phone: value(formData, "phone"),
    instagram: value(formData, "instagram"),
    source: value(formData, "source") ?? "Manual",
    initial_message: value(formData, "initial_message"),
    current_stage: "new",
    last_interaction_at: new Date().toISOString(),
    status: "open",
  });

  revalidateApp();
}

export async function updateGrowthPlanStartDate(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const startDate = value(formData, "growth_plan_start_date");

  if (!startDate || context.userRole !== "platform_admin") {
    return;
  }

  await supabase
    .from("studios")
    .update({
      growth_plan_start_date: startDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.studioId);

  revalidateApp();
}

export async function moveLead(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const leadId = value(formData, "lead_id");
  const stage = value(formData, "stage") as LeadStage | null;

  if (!leadId || !stage) {
    return;
  }

  await supabase.from("leads").update({ current_stage: stage }).eq("id", leadId);
  revalidateApp();
}

export async function convertLeadToCustomer(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const leadId = value(formData, "lead_id");
  const name = value(formData, "name");
  const phone = value(formData, "phone");

  if (!leadId || !name) {
    return;
  }

  const { data: existingLead } = await supabase
    .from("leads")
    .select("current_stage")
    .eq("id", leadId)
    .eq("studio_id", context.studioId)
    .maybeSingle();

  const customerPayload = {
    studio_id: context.studioId,
    name,
    phone,
    instagram: value(formData, "instagram"),
    email: value(formData, "email"),
    birth_date: value(formData, "birth_date"),
    source: value(formData, "source"),
    notes: value(formData, "notes"),
    status: "active",
  };

  const { data: customer } = phone
    ? await supabase
        .from("customers")
        .upsert(customerPayload, { onConflict: "studio_id,phone" })
        .select("id")
        .single()
    : await supabase.from("customers").insert(customerPayload).select("id").single();

  if (!customer?.id) {
    return;
  }

  await supabase
    .from("leads")
    .update({
      customer_id: customer.id,
      current_stage: "customer",
      status: "converted",
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await supabase.from("lead_stage_history").insert({
    studio_id: context.studioId,
    lead_id: leadId,
    from_stage: existingLead?.current_stage ?? null,
    to_stage: "customer",
    changed_by: context.userId,
    reason: "Conversao com formulario de cliente",
  });

  const appointmentStart = value(formData, "appointment_start");
  const procedure = value(formData, "procedure");

  if (appointmentStart) {
    const start = new Date(appointmentStart);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const hasConflict = await hasAppointmentConflict(supabase, context.studioId, start, end);

    if (hasConflict) {
      revalidateApp();
      redirect("/crm");
    }

    await supabase.from("appointments").insert({
      studio_id: context.studioId,
      customer_id: customer.id,
      lead_id: leadId,
      title: name,
      procedure,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "scheduled",
      created_by: context.userId,
      notes: value(formData, "appointment_notes"),
    });
  }

  revalidateApp();
  redirect("/crm");
}

export async function createCustomer(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();

  await supabase.from("customers").insert({
    studio_id: context.studioId,
    name: value(formData, "name"),
    phone: value(formData, "phone"),
    instagram: value(formData, "instagram"),
    email: value(formData, "email"),
    birth_date: value(formData, "birth_date"),
    source: value(formData, "source") ?? "Manual",
    tags: value(formData, "tags")?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
    notes: value(formData, "notes"),
    status: "active",
  });

  revalidateApp();
}

export async function updateCustomer(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const customerId = value(formData, "customer_id");
  const name = value(formData, "name");

  if (!customerId || !name) {
    return;
  }

  await supabase
    .from("customers")
    .update({
      name,
      phone: value(formData, "phone"),
      instagram: value(formData, "instagram"),
      email: value(formData, "email"),
      birth_date: value(formData, "birth_date"),
      source: value(formData, "source"),
      tags: value(formData, "tags")?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
      notes: value(formData, "notes"),
      status: value(formData, "status") ?? "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("studio_id", context.studioId);

  revalidateApp();
}

export async function deleteCustomer(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const customerId = value(formData, "customer_id");

  if (!customerId) {
    return;
  }

  await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("studio_id", context.studioId);

  revalidateApp();
}

export async function createAppointment(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const startValue = value(formData, "start_time");

  if (!startValue) {
    return;
  }

  const start = new Date(startValue);
  const duration = Number(value(formData, "duration_minutes") ?? 60);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const hasConflict = await hasAppointmentConflict(supabase, context.studioId, start, end);

  if (hasConflict) {
    revalidateApp();
    return;
  }

  await supabase.from("appointments").insert({
    studio_id: context.studioId,
    customer_id: value(formData, "customer_id"),
    title: value(formData, "title"),
    procedure: value(formData, "procedure"),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "scheduled",
    created_by: context.userId,
    notes: value(formData, "notes"),
  });

  revalidateApp();
}

export async function updateAppointmentStatus(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const appointmentId = value(formData, "appointment_id");
  const status = value(formData, "status");

  if (!appointmentId || !status) {
    return { ok: false, error: "Status invalido." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("studio_id", context.studioId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateApp();
  return { ok: true };
}

export async function completeAppointmentWithSale(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const appointmentId = value(formData, "appointment_id");
  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));

  if (!appointmentId || !Number.isFinite(amount) || amount < 0) {
    return;
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, studio_id, customer_id, title, procedure, start_time, end_time")
    .eq("id", appointmentId)
    .eq("studio_id", context.studioId)
    .single();

  if (!appointment) {
    return;
  }

  await supabase
    .from("appointments")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", appointment.id)
    .eq("studio_id", context.studioId);

  await supabase.from("sales").insert({
    studio_id: context.studioId,
    customer_id: appointment.customer_id,
    sale_date: appointment.start_time.slice(0, 10),
    amount,
    description: value(formData, "description") ?? appointment.procedure ?? appointment.title,
    payment_method: value(formData, "payment_method"),
    created_by: context.userId,
  });

  if (appointment.customer_id) {
    const [{ count: appointmentCount }, { data: customerSales }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", context.studioId)
        .eq("customer_id", appointment.customer_id)
        .neq("status", "cancelled"),
      supabase
        .from("sales")
        .select("amount")
        .eq("studio_id", context.studioId)
        .eq("customer_id", appointment.customer_id),
    ]);
    const lifetimeValue = (customerSales ?? []).reduce((sum, sale) => sum + Number(sale.amount), 0);

    await supabase
      .from("customers")
      .update({
        appointment_count: appointmentCount ?? 0,
        lifetime_value: lifetimeValue,
        last_visit_at: appointment.start_time,
        next_visit_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.customer_id)
      .eq("studio_id", context.studioId);

    const returnDueAt = new Date(new Date(appointment.start_time).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: existingReturnTask }, { data: existingReturnLead }, { data: customer }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id")
        .eq("studio_id", context.studioId)
        .eq("appointment_id", appointment.id)
        .eq("type", "return_7_days")
        .maybeSingle(),
      supabase
        .from("leads")
        .select("id")
        .eq("studio_id", context.studioId)
        .eq("customer_id", appointment.customer_id)
        .eq("current_stage", "return_7_days")
        .neq("status", "archived")
        .maybeSingle(),
      supabase
        .from("customers")
        .select("name,phone,instagram,source,notes")
        .eq("id", appointment.customer_id)
        .eq("studio_id", context.studioId)
        .maybeSingle(),
    ]);

    if (!existingReturnTask?.id) {
      await supabase.from("tasks").insert({
        studio_id: context.studioId,
        customer_id: appointment.customer_id,
        appointment_id: appointment.id,
        title: "Retorno de 7 dias",
        description: "Conferir cicatrizacao, orientar cuidados e registrar relacionamento.",
        due_at: returnDueAt,
        type: "return_7_days",
        created_by: context.userId,
      });
    }

    if (!existingReturnLead?.id) {
      await supabase.from("leads").insert({
        studio_id: context.studioId,
        customer_id: appointment.customer_id,
        name: customer?.name ?? appointment.title,
        phone: customer?.phone ?? null,
        instagram: customer?.instagram ?? null,
        source: "Retorno 7 dias",
        initial_message: `Retorno de 7 dias - ${appointment.procedure ?? appointment.title}`,
        current_stage: "return_7_days",
        last_interaction_at: new Date().toISOString(),
        next_follow_up_at: returnDueAt,
        status: "open",
        notes: customer?.notes ?? null,
      });
    }
  }

  revalidateApp();
}

export async function deleteAppointment(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const appointmentId = value(formData, "appointment_id");

  if (!appointmentId) {
    return;
  }

  await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("studio_id", context.studioId);

  revalidateApp();
}

export async function addLeadNote(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const leadId = value(formData, "lead_id");
  const body = value(formData, "body");

  if (!leadId || !body) {
    return;
  }

  await supabase.from("notes").insert({
    studio_id: context.studioId,
    lead_id: leadId,
    body,
    created_by: context.userId,
  });

  await supabase
    .from("leads")
    .update({
      notes: body,
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidateApp();
}

export async function scheduleLead(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const leadId = value(formData, "lead_id");
  const title = value(formData, "title");
  const startValue = value(formData, "start_time");

  if (!leadId || !title || !startValue) {
    return;
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, studio_id, customer_id, name, phone, instagram, source, initial_message, notes")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return;
  }

  const customerId = await ensureCustomerForScheduledLead(supabase, {
    ...lead,
    studio_id: context.studioId,
    name: lead.name ?? title,
  });
  const start = new Date(startValue);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const hasConflict = await hasAppointmentConflict(supabase, context.studioId, start, end);

  if (hasConflict) {
    revalidateApp();
    return;
  }

  await supabase.from("appointments").insert({
    studio_id: context.studioId,
    customer_id: customerId,
    lead_id: leadId,
    title,
    procedure: value(formData, "procedure"),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "scheduled",
    created_by: context.userId,
    notes: value(formData, "notes"),
  });

  await supabase
    .from("leads")
    .update({
      customer_id: customerId,
      current_stage: "customer",
      status: "converted",
      next_follow_up_at: start.toISOString(),
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidateApp();
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type ScheduledLead = {
  id: string;
  studio_id: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  source: string | null;
  initial_message: string | null;
  notes: string | null;
};

async function ensureCustomerForScheduledLead(supabase: ServerSupabaseClient, lead: ScheduledLead) {
  if (lead.customer_id) {
    return lead.customer_id;
  }

  if (lead.phone) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("studio_id", lead.studio_id)
      .eq("phone", lead.phone)
      .maybeSingle();

    if (existingCustomer?.id) {
      await supabase
        .from("customers")
        .update({
          name: lead.name,
          instagram: lead.instagram,
          source: lead.source,
          notes: lead.notes ?? lead.initial_message,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCustomer.id);

      return existingCustomer.id;
    }
  }

  const { data: customer } = await supabase
    .from("customers")
    .insert({
      studio_id: lead.studio_id,
      name: lead.name,
      phone: lead.phone,
      instagram: lead.instagram,
      source: lead.source,
      notes: lead.notes ?? lead.initial_message,
      status: "active",
    })
    .select("id")
    .single();

  return customer?.id ?? null;
}

async function hasAppointmentConflict(
  supabase: ServerSupabaseClient,
  studioId: string,
  start: Date,
  end: Date,
) {
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  return Boolean(count && count > 0);
}

export async function updateLeadStatus(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const leadId = value(formData, "lead_id");
  const status = value(formData, "status");

  if (!leadId || !status) {
    return;
  }

  await supabase.from("leads").update({ status }).eq("id", leadId);
  revalidateApp();
}

export async function updateChecklistStatus(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const templateId = value(formData, "template_id");
  const status = value(formData, "status") ?? "pending";

  if (!templateId) {
    return;
  }

  let checklistItemId = value(formData, "checklist_item_id");

  if (!checklistItemId) {
    const { data: template } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    const { data: existingItem } = await supabase
      .from("checklist_items")
      .select("id")
      .eq("studio_id", context.studioId)
      .eq("template_id", templateId)
      .maybeSingle();

    checklistItemId = existingItem?.id ?? null;

    if (!checklistItemId && template) {
      const { data: insertedItem } = await supabase
        .from("checklist_items")
        .insert({
          studio_id: context.studioId,
          template_id: template.id,
          month_number: template.month_number,
          suggested_week: template.suggested_week,
          title: template.title,
          description: template.description,
          category: template.category,
          points: template.points,
        })
        .select("id")
        .single();

      checklistItemId = insertedItem?.id ?? null;
    }
  }

  if (!checklistItemId) {
    return;
  }

  await supabase.from("studio_checklist_progress").upsert(
    {
      studio_id: context.studioId,
      checklist_item_id: checklistItemId,
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      evidence_text: value(formData, "evidence_text"),
      notes: value(formData, "notes"),
      updated_by: context.userId,
    },
    { onConflict: "studio_id,checklist_item_id" },
  );

  revalidateApp();
}

export async function registerAgencyInterest(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();

  await supabase.from("agency_interest").insert({
    studio_id: context.studioId,
    user_id: context.userId,
    message: value(formData, "message") ?? "Quero avaliar gestao de trafego",
    status: "new",
  });

  revalidateApp();
}

export async function createSale(formData: FormData) {
  const context = await getAppContext();
  const supabase = await createServerSupabaseClient();
  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));

  await supabase.from("sales").insert({
    studio_id: context.studioId,
    customer_id: value(formData, "customer_id"),
    sale_date: value(formData, "sale_date") ?? new Date().toISOString().slice(0, 10),
    amount: Number.isFinite(amount) ? amount : 0,
    description: value(formData, "description"),
    payment_method: value(formData, "payment_method"),
    created_by: context.userId,
  });

  revalidateApp();
}
