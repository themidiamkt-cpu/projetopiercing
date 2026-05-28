"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { convertLeadToCustomer } from "@/app/actions/studio";
import { crmStages } from "@/lib/mock-data";
import { LeadCard } from "@/components/crm/lead-card";
import { Field, TextArea } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { stageStyles } from "@/lib/crm";
import { cn } from "@/lib/utils";
import type { Lead, LeadStage } from "@/types/domain";

const automaticStages = new Set<LeadStage>(["inactive_30_days", "birthday_month"]);

type ConversionCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
  birth_date?: string | null;
  source?: string | null;
  notes?: string | null;
};

export function CRMKanban({ leads }: { leads: Lead[] }) {
  const [localLeads, setLocalLeads] = useState(leads);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [conversionCustomer, setConversionCustomer] = useState<ConversionCustomer | null>(null);
  const [, startTransition] = useTransition();

  const leadsByStage = useMemo(() => {
    return crmStages.reduce<Record<LeadStage, Lead[]>>((acc, stage) => {
      acc[stage.id] = localLeads.filter((lead) => lead.current_stage === stage.id);
      return acc;
    }, {} as Record<LeadStage, Lead[]>);
  }, [localLeads]);

  async function persistMove(leadId: string, stage: LeadStage, previousLeads: Lead[]) {
    const response = await fetch("/api/leads/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, stage }),
    });

    if (!response.ok) {
      setLocalLeads(previousLeads);
      if (stage === "customer") {
        setConversionLead(null);
        setConversionCustomer(null);
      }
      return;
    }

    const payload = await response.json().catch(() => null);

    if (stage === "customer" && payload?.customer_id) {
      setLocalLeads((current) =>
        current.map((item) => (item.id === leadId ? { ...item, customer_id: payload.customer_id, status: "converted" } : item)),
      );
      setConversionCustomer(payload.customer ?? null);
    }
  }

  function moveLeadToStage(leadId: string, stage: LeadStage) {
    const lead = localLeads.find((item) => item.id === leadId);

    if (automaticStages.has(stage)) {
      return;
    }

    if (!lead || lead.current_stage === stage) {
      return;
    }

    const previousLeads = localLeads;
    setLocalLeads((current) =>
      current.map((item) => (item.id === leadId ? { ...item, current_stage: stage } : item)),
    );

    if (stage === "customer") {
      setConversionCustomer(null);
      setConversionLead({ ...lead, current_stage: "customer", status: "converted" });
    }

    startTransition(() => {
      void persistMove(leadId, stage, previousLeads);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_18px_50px_rgba(17,17,17,0.04)]">
      <div className="border-b border-[#E7E5E4] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111111]">CRM</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Arraste cards entre etapas. Ao mover para Cliente, o cadastro e o vinculo sao criados automaticamente.
        </p>
      </div>
      <div className="grid auto-cols-[300px] grid-flow-col gap-3 overflow-x-auto bg-[#F7F7F5] p-4">
        {crmStages.map((stage) => {
          const style = stageStyles[stage.id];
          const stageLeads = leadsByStage[stage.id] ?? [];
          const isOver = overStage === stage.id;
          const isAutomaticStage = automaticStages.has(stage.id);

          return (
            <div
              className={cn(
                "flex max-h-[calc(100vh-260px)] min-h-[520px] flex-col gap-3 rounded-2xl border border-transparent p-1 transition",
                isOver && !isAutomaticStage && "border-[#B08968] bg-white shadow-sm",
                isAutomaticStage && "cursor-not-allowed",
              )}
              key={stage.id}
              onDragLeave={() => setOverStage(null)}
              onDragOver={(event) => {
                if (isAutomaticStage) {
                  event.dataTransfer.dropEffect = "none";
                  return;
                }

                event.preventDefault();
                setOverStage(stage.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const leadId = event.dataTransfer.getData("text/plain") || draggingLeadId;
                setDraggingLeadId(null);
                setOverStage(null);

                if (leadId && !isAutomaticStage) {
                  moveLeadToStage(leadId, stage.id);
                }
              }}
            >
              <div className={cn("rounded-2xl border p-4", style.border, style.header)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", style.accent)} />
                    <h3 className="text-sm font-semibold text-[#111111]">{stage.title}</h3>
                  </div>
                  <span className={cn("rounded-md px-2 py-1 text-xs font-medium", style.badge)}>
                    {stageLeads.length}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  {stage.description}
                  {isAutomaticStage ? " Organizado automaticamente." : ""}
                </p>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1">
                {stageLeads.map((lead) => (
                  <LeadCard
                    isDragging={draggingLeadId === lead.id}
                    lead={lead}
                    key={lead.id}
                    onDragEnd={() => setDraggingLeadId(null)}
                    onDragStart={() => setDraggingLeadId(lead.id)}
                  />
                ))}
                {!stageLeads.length ? (
                  <div className={cn("rounded-2xl border border-dashed p-5 text-center text-xs text-[#6B7280]", style.border)}>
                    {isAutomaticStage ? "O sistema adiciona cards aqui" : "Solte um card aqui"}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {conversionLead ? (
        <LeadConversionModal
          customer={conversionCustomer}
          lead={conversionLead}
          onClose={() => {
            setConversionLead(null);
            setConversionCustomer(null);
          }}
        />
      ) : null}
    </section>
  );
}

function LeadConversionModal({
  customer,
  lead,
  onClose,
}: {
  customer?: ConversionCustomer | null;
  lead: Lead;
  onClose: () => void;
}) {
  const name = customer?.name ?? lead.name;
  const phone = customer?.phone ?? lead.phone ?? "";
  const instagram = customer?.instagram ?? lead.instagram ?? "";
  const email = customer?.email ?? "";
  const birthDate = customer?.birth_date ?? "";
  const source = customer?.source ?? lead.source ?? "";
  const notes = customer?.notes ?? lead.notes ?? lead.initial_message ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Completar cadastro da cliente</h2>
            <p className="mt-1 text-sm text-slate-500">
              O lead ja foi movido para Cliente. {customer ? "Carregamos os dados reais do cadastro existente." : "Complete os dados para deixar o cadastro pronto."}
            </p>
          </div>
          <Button aria-label="Fechar" className="h-8 w-8 p-0" onClick={onClose} type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={convertLeadToCustomer} className="space-y-4 px-5 py-4" key={customer?.id ?? lead.id}>
          <input name="lead_id" type="hidden" value={lead.id} />
          <input name="source" type="hidden" value={source} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field defaultValue={name} label="Nome completo" name="name" required />
            <Field defaultValue={phone} label="Telefone" name="phone" />
            <Field defaultValue={instagram} label="Instagram" name="instagram" />
            <Field defaultValue={email} label="Email" name="email" type="email" />
            <Field defaultValue={birthDate} label="Aniversario" name="birth_date" type="date" />
            <Field label="Procedimento" name="procedure" placeholder="Nostril, septo, troca de joia" />
            <Field label="Data do agendamento" name="appointment_start" type="datetime-local" />
          </div>
          <TextArea defaultValue={notes} label="Observacoes" name="notes" />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button onClick={onClose} type="button" variant="ghost">
              Preencher depois
            </Button>
            <Button type="submit">Salvar cliente</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
