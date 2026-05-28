"use client";

import { useState } from "react";
import { CalendarPlus, MessageCircle, MoreHorizontal } from "lucide-react";
import { addLeadNote, updateLeadStatus } from "@/app/actions/studio";
import { Button } from "@/components/ui/button";
import { stageStyles } from "@/lib/crm";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/domain";

export function LeadCard({
  lead,
  isDragging,
  onDragEnd,
  onDragStart,
}: {
  lead: Lead;
  isDragging?: boolean;
  onDragEnd?: () => void;
  onDragStart?: () => void;
}) {
  const style = stageStyles[lead.current_stage];
  const [panel, setPanel] = useState<"note" | "noteView" | "schedule" | "actions" | null>(null);
  const [noteText, setNoteText] = useState(lead.notes ?? "");
  const [noteJustSaved, setNoteJustSaved] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  async function handleNoteSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();

    if (!body) {
      return;
    }

    await addLeadNote(formData);
    setNoteText(body);
    setNoteJustSaved(true);
    setPanel("noteView");
  }

  async function handleScheduleSubmit(formData: FormData) {
    setScheduleError(null);
    setScheduleSuccess(null);
    setIsScheduling(true);

    try {
      const response = await fetch("/api/leads/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          title: lead.name,
          procedure: String(formData.get("procedure") ?? ""),
          startTime: String(formData.get("start_time") ?? ""),
          notes: String(formData.get("notes") ?? ""),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setScheduleError(payload?.error ?? "Nao foi possivel criar o agendamento.");
        return;
      }

      setScheduleSuccess("Agendamento criado e lead movido para Cliente.");
      setPanel(null);
      window.location.reload();
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <article
      className={cn(
        "cursor-grab rounded-lg border bg-white p-3 shadow-sm transition active:cursor-grabbing",
        style.border,
        isDragging && "scale-[0.98] opacity-50 ring-2 ring-slate-300",
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
        onDragStart?.();
      }}
    >
      <div className={cn("-mx-3 -mt-3 mb-3 h-1.5 rounded-t-lg", style.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{lead.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{lead.phone ?? lead.instagram}</p>
        </div>
        <Button
          variant="ghost"
          aria-label="Abrir acoes do lead"
          className="h-7 w-7 p-0"
          onClick={() => setPanel(panel === "actions" ? null : "actions")}
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{lead.initial_message}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn("rounded-md px-2 py-1 text-xs font-medium", style.badge)}>
          {lead.source}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            aria-label="Adicionar nota"
            className={cn("relative h-7 w-7 p-0", noteText && "bg-slate-100")}
            onClick={() => setPanel(panel === (noteText ? "noteView" : "note") ? null : noteText ? "noteView" : "note")}
            type="button"
          >
            <MessageCircle className="h-4 w-4" />
            {noteText ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
            ) : null}
          </Button>
          <Button
            variant="ghost"
            aria-label="Agendar lead"
            className="h-7 w-7 p-0"
            onClick={() => {
              setScheduleError(null);
              setScheduleSuccess(null);
              setPanel(panel === "schedule" ? null : "schedule");
            }}
            type="button"
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {noteText ? (
        <button
          className={cn(
            "mt-3 w-full rounded-md border px-2 py-2 text-left text-xs font-medium transition",
            noteJustSaved
              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
          )}
          onClick={() => setPanel(panel === "noteView" ? null : "noteView")}
          type="button"
        >
          {noteJustSaved ? "Nota adicionada" : "Nota registrada"}
        </button>
      ) : null}
      {panel === "note" ? (
        <form action={handleNoteSubmit} className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <input name="lead_id" type="hidden" value={lead.id} />
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
            name="body"
            placeholder="Adicionar nota sobre conversa, objeção ou próximo passo"
            required
          />
          <div className="flex justify-end gap-2">
            <Button className="h-8 px-2 text-xs" onClick={() => setPanel(null)} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button className="h-8 px-2 text-xs" type="submit">
              Salvar nota
            </Button>
          </div>
        </form>
      ) : null}
      {panel === "noteView" ? (
        <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-semibold text-amber-900">Nota do lead</p>
          <p className="whitespace-pre-wrap rounded-md bg-white px-2 py-2 text-xs text-slate-700">{noteText}</p>
          <div className="flex justify-end gap-2">
            <Button className="h-8 px-2 text-xs" onClick={() => setPanel("note")} type="button" variant="ghost">
              Nova nota
            </Button>
            <Button className="h-8 px-2 text-xs" onClick={() => setPanel(null)} type="button" variant="secondary">
              Fechar
            </Button>
          </div>
        </div>
      ) : null}
      {panel === "schedule" ? (
        <form action={handleScheduleSubmit} className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <input name="lead_id" type="hidden" value={lead.id} />
          <input name="title" type="hidden" value={lead.name} />
          <input
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-slate-400"
            name="procedure"
            placeholder="Procedimento"
          />
          <input
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-slate-400"
            name="start_time"
            required
            type="datetime-local"
          />
          <p className="text-xs text-slate-500">Horarios ja ocupados nao serao agendados novamente.</p>
          {scheduleError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs font-medium text-red-700">
              {scheduleError}
            </div>
          ) : null}
          {scheduleSuccess ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-700">
              {scheduleSuccess}
            </div>
          ) : null}
          <textarea
            className="min-h-16 w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
            name="notes"
            placeholder="Observações do agendamento"
          />
          <div className="flex justify-end gap-2">
            <Button className="h-8 px-2 text-xs" onClick={() => setPanel(null)} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button className="h-8 px-2 text-xs" disabled={isScheduling} type="submit">
              {isScheduling ? "Agendando..." : "Agendar"}
            </Button>
          </div>
        </form>
      ) : null}
      {panel === "actions" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <form action={updateLeadStatus}>
            <input name="lead_id" type="hidden" value={lead.id} />
            <input name="status" type="hidden" value="archived" />
            <Button className="h-8 w-full px-2 text-xs" type="submit" variant="secondary">
              Arquivar
            </Button>
          </form>
          <form action={updateLeadStatus}>
            <input name="lead_id" type="hidden" value={lead.id} />
            <input name="status" type="hidden" value="lost" />
            <Button className="h-8 w-full px-2 text-xs" type="submit" variant="secondary">
              Perdido
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
