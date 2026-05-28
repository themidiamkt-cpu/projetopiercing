import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/lib/supabase/queries";

const sendMessageSchema = z.object({
  telefone: z.string().min(8),
  mensagem: z.string().min(1),
  tipo_evento: z.string().default("mensagem_manual"),
});

export async function POST(request: Request) {
  const url = process.env.WHATSAPP_VISIT_WEBHOOK_URL;

  if (!url) {
    return NextResponse.json({ error: "Envio WhatsApp nao configurado." }, { status: 500 });
  }

  const payload = sendMessageSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const context = await getAppContext();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload.data,
      instancia: context.studioId,
      studio_id: context.studioId,
      restaurante_id: context.studioId,
    }),
  });

  const responsePayload = await response.text().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nao foi possivel enviar a mensagem.", details: responsePayload },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true, payload: responsePayload });
}
