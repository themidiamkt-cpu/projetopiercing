import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthItem } from "@/lib/supabase/queries";

export function ExecutionScoreCard({ items }: { items: GrowthItem[] }) {
  const total = items.reduce((sum, item) => sum + item.points, 0);
  const done = items.filter((item) => item.status === "done").reduce((sum, item) => sum + item.points, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const status =
    percent >= 90
      ? "Excelente execucao"
      : percent >= 70
        ? "Boa execucao"
        : percent >= 40
          ? "Execucao em andamento"
          : "Execucao baixa";
  const pendingItems = items.filter((item) => item.status !== "done").slice(0, 4);
  const doneItems = items.filter((item) => item.status === "done").slice(0, 4);
  const visibleItems = pendingItems.length ? pendingItems : doneItems;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano de Crescimento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold text-slate-950">{percent}%</p>
            <p className="mt-1 text-sm text-slate-500">{status}, sem promessa de resultado financeiro.</p>
          </div>
          <div className="rounded-md bg-emerald-50 p-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.id}>
              <span className="text-slate-700">{item.title}</span>
              <span className="font-medium text-slate-500">{item.status === "done" ? "ok" : `${item.points} pts`}</span>
            </div>
          ))}
          {!visibleItems.length ? (
            <p className="text-sm text-slate-500">Nenhum checklist encontrado.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
