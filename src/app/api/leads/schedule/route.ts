import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const scheduleLeadSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().min(1),
  procedure: z.string().optional(),
  startTime: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = scheduleLeadSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: "Dados do agendamento invalidos." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, studio_id, customer_id, name, phone, instagram, source, initial_message, notes, current_stage")
    .eq("id", payload.data.leadId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrado." }, { status: 404 });
  }

  const start = new Date(payload.data.startTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const conflict = await findAppointmentConflict(supabase, lead.studio_id, start, end);

  if (conflict) {
    return NextResponse.json(
      {
        error: `Horario indisponivel. Ja existe agendamento para ${new Date(conflict.start_time).toLocaleString("pt-BR")}.`,
      },
      { status: 409 },
    );
  }

  const customerId = await ensureCustomerForLead(supabase, lead);

  const { error: appointmentError } = await supabase.from("appointments").insert({
    studio_id: lead.studio_id,
    customer_id: customerId,
    lead_id: lead.id,
    title: payload.data.title,
    procedure: payload.data.procedure || null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "scheduled",
    created_by: user.id,
    notes: payload.data.notes || null,
  });

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 500 });
  }

  await supabase
    .from("leads")
    .update({
      customer_id: customerId,
      current_stage: "customer",
      status: "converted",
      next_follow_up_at: start.toISOString(),
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  await supabase.from("lead_stage_history").insert({
    studio_id: lead.studio_id,
    lead_id: lead.id,
    from_stage: lead.current_stage,
    to_stage: "customer",
    changed_by: user.id,
    reason: "Agendamento criado pelo CRM",
  });

  revalidatePath("/");
  revalidatePath("/crm");
  revalidatePath("/clientes");
  revalidatePath("/calendario");
  revalidatePath("/relatorios");

  return NextResponse.json({ ok: true, customer_id: customerId });
}

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type LeadForSchedule = {
  id: string;
  studio_id: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  source: string | null;
  initial_message: string | null;
  notes: string | null;
  current_stage: string;
};

async function findAppointmentConflict(
  supabase: SupabaseClient,
  studioId: string,
  start: Date,
  end: Date,
) {
  const { data } = await supabase
    .from("appointments")
    .select("id, title, start_time, end_time")
    .eq("studio_id", studioId)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

async function ensureCustomerForLead(supabase: SupabaseClient, lead: LeadForSchedule) {
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
      return existingCustomer.id;
    }
  }

  const { data: customer, error } = await supabase
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

  if (error || !customer?.id) {
    throw new Error(error?.message ?? "Nao foi possivel criar cliente.");
  }

  return customer.id;
}
