import { GrowthPlanTabs } from "@/components/growth/growth-plan-tabs";
import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCurrentPlanDay,
  getCurrentPlanMonth,
  getGrowthPlanStartDate,
  getMonthlyExecution,
  scheduleGrowthItems,
} from "@/lib/growth-plan";
import { getAppContext, getGrowthItems } from "@/lib/supabase/queries";

export default async function PlanoPage() {
  const context = await getAppContext();
  const items = await getGrowthItems(context.studioId);
  const planStartDate = getGrowthPlanStartDate(context.growthPlanStartDate, context.studioCreatedAt);
  const scheduledItems = scheduleGrowthItems(items, planStartDate);
  const currentMonth = getCurrentPlanMonth(planStartDate);
  const currentDay = getCurrentPlanDay(planStartDate);
  const monthlyExecution = getMonthlyExecution(scheduledItems, currentMonth);
  const total = items.reduce((sum, item) => sum + item.points, 0);
  const done = items.filter((item) => item.status === "done").reduce((sum, item) => sum + item.points, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const status =
    percent >= 90 ? "excelente execucao" : percent >= 70 ? "boa execucao" : percent >= 40 ? "execucao em andamento" : "execucao baixa";

  return (
    <StudioPageShell title="Plano de Crescimento" eyebrow={context.studioName}>
      <PageHeader
        title="Plano de Crescimento"
        description="Acompanhamento estrategico de 3 meses. A pontuacao mede execucao, nao promessa de faturamento."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Pontuacao total</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{done}/{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Execucao geral</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{percent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Meta mensal atual</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{monthlyExecution.percent}%</p>
            <p className="mt-1 text-xs text-slate-500">
              Mes {currentMonth}, dia {currentDay} do plano
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Status visual</p>
            <p className="mt-2 text-xl font-semibold capitalize text-slate-950">{status}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <strong className="text-slate-950">Inicio do plano:</strong>{" "}
        {new Date(`${planStartDate}T00:00:00`).toLocaleDateString("pt-BR")}. As tarefas abaixo recebem prazo
        automatico por dia do plano. Exemplo: tarefas da semana 1 vencem ate 5 dias apos o inicio do mes correspondente.
      </div>

      <GrowthPlanTabs currentMonth={currentMonth} items={scheduledItems} />
    </StudioPageShell>
  );
}
