declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const defaultPiercingWebhook = "https://automacao2.themidiamarketing.com.br/webhook/piercing";
const defaultVisitWebhook = "https://automacao2.themidiamarketing.com.br/webhook/visita-piercing";

type JsonRecord = Record<string, unknown>;

type NormalizedMessage = {
  studioId: string;
  name: string;
  phone: string;
  message: string;
  source: string;
  channel: "whatsapp";
  externalTimestamp: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const url = new URL(request.url);
  const studioId = url.searchParams.get("id");

  if (!studioId) {
    return json({ error: "Missing studio id in query string." }, 400);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid Evolution payload." }, 400);
  }

  const targetUrl = resolveTargetUrl(body, url);
  const forwardedBody = {
    ...body,
    studio_id: studioId,
    studioId,
    restaurante_id: studioId,
    restauranteId: studioId,
    received_at: new Date().toISOString(),
  };
  const normalizedMessage = normalizeEvolutionMessage(body, studioId);
  const crmResult = normalizedMessage ? await syncCrmLead(normalizedMessage, body) : { status: "skipped" };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: buildForwardHeaders(studioId),
    body: JSON.stringify(forwardedBody),
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    return json(
      {
        error: "Could not forward Evolution payload.",
        target_status: response.status,
        target_response: responseText,
      },
      502,
    );
  }

  return json({
    ok: true,
    studio_id: studioId,
    crm: crmResult,
    target: targetUrl,
    target_status: response.status,
  });
});

function normalizeEvolutionMessage(body: JsonRecord, studioId: string): NormalizedMessage | null {
  const data = asRecord(body.data);
  const key = asRecord(data.key);
  const messagePayload = asRecord(data.message);
  const fromMe = Boolean(key.fromMe);

  if (fromMe) {
    return null;
  }

  const rawPhone =
    readString(key, "remoteJid") ??
    readString(body, "phone") ??
    readString(body, "telefone") ??
    readString(data, "remoteJid") ??
    readString(data, "sender");
  const phone = normalizePhone(rawPhone);
  const message =
    readString(messagePayload, "conversation") ??
    readString(asRecord(messagePayload.extendedTextMessage), "text") ??
    readString(asRecord(messagePayload.imageMessage), "caption") ??
    readString(asRecord(messagePayload.videoMessage), "caption") ??
    readString(body, "message") ??
    readString(body, "mensagem") ??
    readString(body, "conteudo");

  if (!phone || !message) {
    return null;
  }

  const name =
    readString(data, "pushName") ??
    readString(body, "pushName") ??
    readString(body, "name") ??
    readString(body, "nome") ??
    `Contato ${phone.slice(-4)}`;

  return {
    studioId,
    name,
    phone,
    message,
    source: "WhatsApp",
    channel: "whatsapp",
    externalTimestamp: new Date().toISOString(),
  };
}

async function syncCrmLead(message: NormalizedMessage, rawPayload: JsonRecord) {
  const existingLead = await getFirst<{ id: string; customer_id: string | null }>(
    `/leads?select=id,customer_id&studio_id=eq.${encodeURIComponent(message.studioId)}&phone=eq.${encodeURIComponent(
      message.phone,
    )}&status=neq.archived&limit=1`,
  );

  if (existingLead) {
    await supabaseRest(`/leads?id=eq.${encodeURIComponent(existingLead.id)}`, {
      method: "PATCH",
      body: {
        last_interaction_at: message.externalTimestamp,
        notes: message.message,
        updated_at: message.externalTimestamp,
      },
    });

    const inboundMessage = await insertInboundMessage(message, rawPayload, existingLead.id, existingLead.customer_id);

    return {
      status: "updated",
      lead_id: existingLead.id,
      inbound_message_id: inboundMessage?.id,
    };
  }

  const customer = await getFirst<{ id: string }>(
    `/customers?select=id&studio_id=eq.${encodeURIComponent(message.studioId)}&phone=eq.${encodeURIComponent(
      message.phone,
    )}&limit=1`,
  );

  const lead = await supabaseRest<{ id: string }[]>(`/leads?select=id`, {
    method: "POST",
    prefer: "return=representation",
    body: {
      studio_id: message.studioId,
      customer_id: customer?.id ?? null,
      name: message.name,
      phone: message.phone,
      source: message.source,
      initial_message: message.message,
      current_stage: customer ? "customer" : "new",
      last_interaction_at: message.externalTimestamp,
      status: customer ? "converted" : "open",
    },
  });
  const createdLead = lead?.[0];
  const inboundMessage = await insertInboundMessage(message, rawPayload, createdLead?.id, customer?.id);

  return {
    status: "created",
    lead_id: createdLead?.id,
    inbound_message_id: inboundMessage?.id,
  };
}

async function insertInboundMessage(
  message: NormalizedMessage,
  rawPayload: JsonRecord,
  leadId?: string,
  customerId?: string | null,
) {
  const inboundMessages = await supabaseRest<{ id: string }[]>(`/inbound_messages?select=id`, {
    method: "POST",
    prefer: "return=representation",
    body: {
      studio_id: message.studioId,
      lead_id: leadId ?? null,
      customer_id: customerId ?? null,
      name: message.name,
      phone: message.phone,
      message: message.message,
      source: message.source,
      channel: message.channel,
      external_timestamp: message.externalTimestamp,
      raw_payload: rawPayload,
    },
  });

  return inboundMessages?.[0];
}

async function getFirst<T>(path: string) {
  const rows = await supabaseRest<T[]>(path, { method: "GET" });
  return rows?.[0] ?? null;
}

async function supabaseRest<T>(
  path: string,
  options: {
    method: "GET" | "POST" | "PATCH";
    body?: unknown;
    prefer?: string;
  },
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase function is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    method: options.method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
}

function resolveTargetUrl(body: Record<string, unknown>, url: URL) {
  const route = String(url.searchParams.get("route") ?? body.route ?? body.tipo ?? body.type ?? "").toLowerCase();

  if (route.includes("visita") || route.includes("visit")) {
    return Deno.env.get("N8N_VISIT_WEBHOOK_URL") ?? defaultVisitWebhook;
  }

  return Deno.env.get("N8N_PIERCING_WEBHOOK_URL") ?? defaultPiercingWebhook;
}

function buildForwardHeaders(studioId: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-studio-id": studioId,
  });
  const authName = Deno.env.get("N8N_WEBHOOK_AUTH_HEADER_NAME");
  const authValue = Deno.env.get("N8N_WEBHOOK_AUTH_HEADER_VALUE");

  if (authName && authValue) {
    headers.set(authName, authValue);
  }

  return headers;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
