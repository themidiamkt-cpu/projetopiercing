import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const inboundMessageSchema = z.object({
  studio_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  message: z.string().min(1),
  source: z.string().optional(),
  channel: z.enum(["whatsapp", "instagram", "site", "form", "manual"]),
  external_timestamp: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-studio-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-studio-api-key header." }, { status: 401 });
  }

  const payload = inboundMessageSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid inbound message payload.", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  if (!payload.data.phone && !payload.data.instagram) {
    return NextResponse.json(
      { error: "Payload must include phone or instagram as a unique identifier." },
      { status: 400 },
    );
  }

  const supabase = createServiceSupabaseClient();

  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("id")
    .eq("id", payload.data.studio_id)
    .eq("inbound_api_key", apiKey)
    .maybeSingle();

  if (studioError || !studio) {
    return NextResponse.json({ error: "Invalid studio credentials." }, { status: 401 });
  }

  const { data: inboundMessage, error: inboundError } = await supabase
    .from("inbound_messages")
    .insert({
      studio_id: payload.data.studio_id,
      name: payload.data.name,
      phone: payload.data.phone,
      instagram: payload.data.instagram,
      message: payload.data.message,
      source: payload.data.source,
      channel: payload.data.channel,
      external_timestamp: payload.data.external_timestamp,
      raw_payload: payload.data,
    })
    .select("id")
    .single();

  if (inboundError) {
    return NextResponse.json({ error: inboundError.message }, { status: 500 });
  }

  const leadQuery = supabase
    .from("leads")
    .select("id, customer_id")
    .eq("studio_id", payload.data.studio_id)
    .neq("status", "archived");

  const leadMatch = payload.data.phone
    ? leadQuery.eq("phone", payload.data.phone)
    : leadQuery.eq("instagram", payload.data.instagram);

  const { data: existingLead } = await leadMatch.maybeSingle();

  if (existingLead) {
    await supabase
      .from("leads")
      .update({
        last_interaction_at: payload.data.external_timestamp ?? new Date().toISOString(),
        notes: payload.data.message,
      })
      .eq("id", existingLead.id);

    return NextResponse.json({
      status: "updated",
      inbound_message_id: inboundMessage.id,
      lead_id: existingLead.id,
    });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("studio_id", payload.data.studio_id)
    .or(
      [
        payload.data.phone ? `phone.eq.${payload.data.phone}` : undefined,
        payload.data.instagram ? `instagram.eq.${payload.data.instagram}` : undefined,
      ]
        .filter(Boolean)
        .join(","),
    )
    .maybeSingle();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      studio_id: payload.data.studio_id,
      customer_id: customer?.id ?? null,
      name: payload.data.name,
      phone: payload.data.phone,
      instagram: payload.data.instagram,
      source: payload.data.source,
      initial_message: payload.data.message,
      current_stage: customer ? "customer" : "new",
      last_interaction_at: payload.data.external_timestamp ?? new Date().toISOString(),
      status: customer ? "converted" : "open",
    })
    .select("id")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "created",
    inbound_message_id: inboundMessage.id,
    lead_id: lead.id,
  });
}
