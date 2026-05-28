"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChecklistStatus } from "@/app/actions/studio";
import { Field, Select, TextArea } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScheduledGrowthItem } from "@/lib/growth-plan";
import type { GrowthItem } from "@/lib/supabase/queries";

const monthNames = {
  1: "Mes 1: Estrutura e Posicionamento",
  2: "Mes 2: Presenca Local e Demanda",
  3: "Mes 3: Conversao e Preparacao para Escala",
} as const;

const tabs = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendentes" },
  { id: "done", label: "Concluidos" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function GrowthPlanTabs({ items, currentMonth }: { items: ScheduledGrowthItem[]; currentMonth: number }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [localItems, setLocalItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    if (activeTab === "done") {
      return localItems.filter((item) => item.status === "done");
    }

    if (activeTab === "pending") {
      return localItems.filter((item) => item.status !== "done");
    }

    return localItems;
  }, [activeTab, localItems]);

  const counts = {
    all: localItems.length,
    pending: localItems.filter((item) => item.status !== "done").length,
    done: localItems.filter((item) => item.status === "done").length,
  };

  function saveChecklist(formData: FormData) {
    const templateId = String(formData.get("template_id") ?? "");
    const status = formData.get("status") as GrowthItem["status"];
    const evidenceText = String(formData.get("evidence_text") ?? "");
    const notes = String(formData.get("notes") ?? "");

    setLocalItems((current) =>
      current.map((item) =>
        item.id === templateId
          ? {
              ...item,
              status,
              evidence_text: evidenceText || null,
              notes: notes || null,
            }
          : item,
      ),
    );

    startTransition(async () => {
      await updateChecklistStatus(formData);
      router.refresh();
    });
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
            <span className={cn("ml-2 rounded px-1.5 py-0.5 text-xs", activeTab === tab.id ? "bg-white/15" : "bg-slate-100")}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {[1, 2, 3].map((month) => {
        const monthItems = filteredItems.filter((item) => item.month_number === month);

        if (!monthItems.length) {
          return null;
        }

        return (
          <Card key={month}>
            <CardHeader>
              <CardTitle>
                {monthNames[month as 1 | 2 | 3]}
                {month === currentMonth ? (
                  <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    Mes atual
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {monthItems.map((item) => (
                <ChecklistForm isSaving={isPending} item={item} key={item.id} saveChecklist={saveChecklist} />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {!filteredItems.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Nenhuma tarefa nesta aba.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ChecklistForm({
  item,
  isSaving,
  saveChecklist,
}: {
  item: ScheduledGrowthItem;
  isSaving: boolean;
  saveChecklist: (formData: FormData) => void;
}) {
  return (
    <form action={saveChecklist} className="rounded-lg border border-slate-200 p-3">
      <input name="template_id" type="hidden" value={item.id} />
      <input name="checklist_item_id" type="hidden" value={item.checklist_item_id ?? ""} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-950">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={cn("rounded-md px-2 py-1 font-medium", item.is_overdue ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>
              Prazo: {item.due_label}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
              {item.days_until_due > 0
                ? `faltam ${item.days_until_due} dias`
                : item.days_until_due === 0
                  ? "vence hoje"
                  : `${Math.abs(item.days_until_due)} dias atrasada`}
            </span>
          </div>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {item.points} pts
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Select defaultValue={item.status} label="Status" name="status">
          <option value="pending">Pendente</option>
          <option value="in_progress">Em andamento</option>
          <option value="done">Concluido</option>
        </Select>
        <Field defaultValue={item.evidence_text ?? ""} label="Evidencia" name="evidence_text" placeholder="Link ou observacao" />
      </div>
      <div className="mt-2">
        <TextArea defaultValue={item.notes ?? ""} label="Observacoes" name="notes" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">{item.category} - semana {item.suggested_week} - vencimento {item.due_label}</span>
        <Button disabled={isSaving} type="submit" variant="secondary">
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
