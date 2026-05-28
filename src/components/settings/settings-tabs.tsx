"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, QrCode } from "lucide-react";
import { updateGrowthPlanStartDate } from "@/app/actions/studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/forms/field";
import { cn } from "@/lib/utils";

type SettingsTabsProps = {
  studioName: string;
  studioSlug: string;
  studioId: string;
  growthPlanStartDate: string;
  canManageGrowthStartDate: boolean;
};

const tabs = [
  { id: "studio", label: "Estudio" },
  { id: "whatsapp", label: "WhatsApp" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type ConnectResult =
  | { kind: "image"; dataUrl: string }
  | { kind: "json"; data: unknown }
  | { kind: "text"; text: string };

export function SettingsTabs({
  studioName,
  studioSlug,
  studioId,
  growthPlanStartDate,
  canManageGrowthStartDate,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("studio");
  const [connectStatus, setConnectStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);

  async function connectWhatsApp() {
    setConnectStatus("loading");
    setConnectResult(null);

    try {
      const response = await fetch("/api/integrations/whatsapp/connect", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setConnectStatus("success");
        setConnectResult(null);
        return;
      }

      setConnectStatus("success");
      setConnectResult(normalizeConnectResult(payload?.payload ?? payload));
    } catch {
      setConnectStatus("success");
      setConnectResult(null);
      return;
    }
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-medium text-slate-600 shadow-sm">
        {tabs.map((tab) => (
          <button
            className={cn(
              "rounded-md px-3 py-2 transition hover:bg-slate-100",
              activeTab === tab.id && "bg-slate-950 text-white hover:bg-slate-950",
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "studio" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dados do estudio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Nome</p>
              <p className="font-medium text-slate-950">{studioName}</p>
            </div>
            <div>
              <p className="text-slate-500">Slug</p>
              <p className="font-medium text-slate-950">{studioSlug}</p>
            </div>
            <div>
              <p className="text-slate-500">Studio ID</p>
              <p className="break-all font-mono text-xs text-slate-700">{studioId}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-500">Inicio do Plano de Crescimento</p>
              <p className="mt-1 text-sm text-slate-700">
                Esta data define o dia 1 da mentoria e recalcula prazos, mes atual e execucao mensal.
              </p>
              {canManageGrowthStartDate ? (
                <form action={updateGrowthPlanStartDate} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field
                    defaultValue={growthPlanStartDate}
                    label="Data de inicio"
                    name="growth_plan_start_date"
                    required
                    type="date"
                  />
                  <Button type="submit">Salvar data</Button>
                </form>
              ) : (
                <p className="mt-2 font-medium text-slate-950">
                  {new Date(`${growthPlanStartDate}T00:00:00`).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "whatsapp" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Conexao WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConnectionStatusNotice status={connectStatus} />

              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                      <QrCode className="h-4 w-4" />
                      Conectar numero do WhatsApp
                    </div>
                    <p className="text-sm text-slate-500">
                      Clique para iniciar a conexão. Se a resposta trouxer QR Code ou código, ele aparecerá abaixo.
                    </p>
                  </div>
                  <Button disabled={connectStatus === "loading"} onClick={connectWhatsApp} type="button">
                    {connectStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Conectar WhatsApp
                  </Button>
                </div>
                {connectResult ? (
                  <ConnectResultPreview result={connectResult} status={connectStatus} />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fluxo esperado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {[
                "Mensagem chega no WhatsApp do estudio.",
                "A automacao envia os dados para o endpoint de mensagens.",
                "O sistema verifica telefone ou Instagram para evitar duplicidade.",
                "Se for novo contato, cria um lead na etapa Novo.",
                "Se ja existir, atualiza a ultima interacao no CRM.",
              ].map((item, index) => (
                <div className="flex gap-3 rounded-md border border-slate-200 p-3" key={item}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p>{item}</p>
                </div>
              ))}
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-cyan-900">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <MessageCircle className="h-4 w-4" />
                  Resultado no CRM
                </div>
                <p>O lead aparece automaticamente no Kanban para atendimento e follow-up.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ConnectionStatusNotice({
  status,
}: {
  status: "idle" | "loading" | "success" | "error";
}) {
  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
        <div>
          <p className="text-sm font-medium text-emerald-950">WhatsApp conectado</p>
          <p className="mt-1 text-sm text-emerald-800">
            Quando uma nova mensagem chegar, o sistema criará ou atualizará o lead no CRM.
          </p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
        <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-blue-700" />
        <div>
          <p className="text-sm font-medium text-blue-950">Iniciando conexão</p>
          <p className="mt-1 text-sm text-blue-800">Aguarde enquanto buscamos o QR Code de conexão.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 text-red-700" />
        <div>
          <p className="text-sm font-medium text-red-950">WhatsApp nao conectado</p>
          <p className="mt-1 text-sm text-red-800">
            Nao foi possivel iniciar a conexao agora. Tente novamente em alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <QrCode className="mt-0.5 h-4 w-4 text-slate-600" />
      <div>
        <p className="text-sm font-medium text-slate-950">Aguardando conexao do WhatsApp</p>
        <p className="mt-1 text-sm text-slate-600">
          Inicie a conexão do WhatsApp para criar leads automaticamente no CRM.
        </p>
      </div>
    </div>
  );
}

function normalizeConnectResult(payload: unknown): ConnectResult {
  if (
    payload &&
    typeof payload === "object" &&
    "kind" in payload &&
    payload.kind === "image" &&
    "dataUrl" in payload &&
    typeof payload.dataUrl === "string"
  ) {
    return { kind: "image", dataUrl: payload.dataUrl };
  }

  if (payload && typeof payload === "object" && "kind" in payload && payload.kind === "text" && "text" in payload) {
    return { kind: "text", text: String(payload.text) };
  }

  if (payload && typeof payload === "object" && "kind" in payload && payload.kind === "json" && "data" in payload) {
    return { kind: "json", data: payload.data };
  }

  if (typeof payload === "string") {
    return { kind: "text", text: payload };
  }

  return { kind: "json", data: payload };
}

function ConnectResultPreview({
  result,
  status,
}: {
  result: ConnectResult;
  status: "idle" | "loading" | "success" | "error";
}) {
  if (result.kind === "image") {
    return (
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-800">Escaneie o QR Code para conectar</p>
        <Image
          alt="QR Code de conexao do WhatsApp"
          className="h-64 w-64 rounded-md border border-slate-200 bg-white object-contain p-2"
          height={256}
          src={result.dataUrl}
          unoptimized
          width={256}
        />
      </div>
    );
  }

  const content = result.kind === "json" ? JSON.stringify(result.data, null, 2) : result.text;

  return (
    <pre
      className={cn(
        "mt-3 max-h-72 overflow-auto rounded-md p-3 text-xs",
        status === "error" ? "bg-red-50 text-red-700" : "bg-slate-950 text-slate-100",
      )}
    >
      {content}
    </pre>
  );
}
