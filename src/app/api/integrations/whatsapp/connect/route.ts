import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/supabase/queries";

export async function POST() {
  const url = process.env.WHATSAPP_CONNECT_WEBHOOK_URL;

  if (!url) {
    return NextResponse.json({ error: "Conexao WhatsApp nao configurada." }, { status: 500 });
  }

  const context = await getAppContext();
  const instanceName = context.studioSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instanceName,
      studio_id: context.studioId,
      studioId: context.studioId,
      restaurante_id: context.studioId,
      restauranteId: context.studioId,
      timestamp: new Date().toISOString(),
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBuffer = Buffer.from(await response.arrayBuffer());
  const payload = parseAutomationResponse(responseBuffer, contentType);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a conexao.", details: payload },
      { status: response.status },
    );
  }

  return NextResponse.json({
    ok: true,
    instanceName,
    payload,
  });
}

function parseAutomationResponse(buffer: Buffer, contentType: string) {
  if (contentType.startsWith("image/")) {
    return {
      kind: "image",
      contentType,
      dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    };
  }

  const text = buffer.toString("utf8");

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(text);

      if (typeof json === "string" && json.startsWith("data:image/")) {
        return { kind: "image", contentType: "image/png", dataUrl: json };
      }

      if (json?.qrcode?.base64) {
        return {
          kind: "image",
          contentType: "image/png",
          dataUrl: json.qrcode.base64.startsWith("data:")
            ? json.qrcode.base64
            : `data:image/png;base64,${json.qrcode.base64}`,
        };
      }

      if (json?.base64) {
        return {
          kind: "image",
          contentType: "image/png",
          dataUrl: String(json.base64).startsWith("data:")
            ? json.base64
            : `data:image/png;base64,${json.base64}`,
        };
      }

      return { kind: "json", data: json };
    } catch {
      return { kind: "text", text };
    }
  }

  if (text.startsWith("\uFFFDPNG") || text.startsWith("\u0089PNG") || buffer.subarray(1, 4).toString("utf8") === "PNG") {
    return {
      kind: "image",
      contentType: "image/png",
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    };
  }

  return { kind: "text", text };
}
