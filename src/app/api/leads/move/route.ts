import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const moveLeadSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum([
    "new",
    "no_response",
    "follow_up_1",
    "follow_up_2",
    "customer",
    "return_7_days",
    "inactive_30_days",
    "birthday_month",
  ]),
});
const manualBlockedStages = new Set(["inactive_30_days", "birthday_month"]);

export async function PATCH(request: Request) {
  const payload = moveLeadSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (manualBlockedStages.has(payload.data.stage)) {
    return NextResponse.json(
      { error: "Esta etapa e gerenciada automaticamente pelo sistema." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: lead, error: leadFetchError } = await supabase
    .from("leads")
    .select("id, studio_id, customer_id, name, phone, instagram, source, initial_message, notes, current_stage, status")
    .eq("id", payload.data.leadId)
    .single();

  if (leadFetchError || !lead) {
    return NextResponse.json({ error: leadFetchError?.message ?? "Lead nao encontrado." }, { status: 404 });
  }

  let customerId = lead.customer_id;
  let customer = null;

  if (payload.data.stage === "customer") {
    try {
      customerId = await ensureCustomerForLead(supabase, lead);
      customer = await getCustomerById(supabase, customerId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Nao foi possivel criar cliente." },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({
      current_stage: payload.data.stage,
      customer_id: customerId,
      status: payload.data.stage === "customer" ? "converted" : lead.status,
      last_interaction_at: now,
      updated_at: now,
    })
    .eq("id", payload.data.leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("lead_stage_history").insert({
    studio_id: lead.studio_id,
    lead_id: lead.id,
    from_stage: lead.current_stage,
    to_stage: payload.data.stage,
    changed_by: user.id,
    reason: payload.data.stage === "customer" ? "Conversao manual no CRM" : "Movimento manual no Kanban",
  });

  revalidatePath("/");
  revalidatePath("/crm");
  revalidatePath("/clientes");
  revalidatePath("/relatorios");

  return NextResponse.json({ ok: true, customer_id: customerId, customer });
}

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type LeadToConvert = {
  id: string;
  studio_id: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  source: string | null;
  initial_message: string | null;
  notes: string | null;
  status: string;
};

async function ensureCustomerForLead(supabase: SupabaseClient, lead: LeadToConvert) {
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

async function getCustomerById(supabase: SupabaseClient, customerId: string | null) {
  if (!customerId) {
    return null;
  }

  const { data } = await supabase
    .from("customers")
    .select("id,name,phone,instagram,email,birth_date,source,notes,status,tags")
    .eq("id", customerId)
    .maybeSingle();

  return data;
}
