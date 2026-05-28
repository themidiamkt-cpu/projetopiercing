import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext, getReportData } from "@/lib/supabase/queries";

export default async function RelatoriosPage() {
  const context = await getAppContext();
  const report = await getReportData(context.studioId);
  const converted = report.leads.filter((lead) => lead.status === "converted").length;
  const completedItems = report.growthItems.filter((item) => item.status === "done");
  const totalPoints = report.growthItems.reduce((sum, item) => sum + item.points, 0);
  const completedPoints = completedItems.reduce((sum, item) => sum + item.points, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSales = report.sales.filter((sale) => sale.sale_date.slice(0, 7) === currentMonth);
  const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.amount), 0);
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const readinessChecks = [
    ["Instagram organizado", completedItems.some((item) => item.category === "Instagram")],
    ["Google otimizado", completedItems.some((item) => item.category === "Google")],
    ["Atendimento estruturado", completedItems.some((item) => item.category === "Atendimento")],
    ["CRM em uso", report.leads.length > 0 && report.tasks.length >= 0],
    ["Agenda organizada", report.appointments.length > 0],
    ["Criativos disponiveis", completedItems.some((item) => item.category === "Trafego")],
  ];
  const readinessScore = readinessChecks.filter(([, ok]) => ok).length;
  const readiness = readinessScore >= 6 ? "Pronta para escalar" : readinessScore >= 4 ? "Boa" : readinessScore >= 2 ? "Media" : "Baixa";
  const pendingReadiness = readinessChecks.filter(([, ok]) => !ok).map(([label]) => label);

  return (
    <StudioPageShell title="Relatorios" eyebrow={context.studioName}>
      <PageHeader
        title="Relatorios"
        description="Resumo de execucao, comercial e prontidao para trafego profissional sem gestao tecnica de campanhas."
      />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Execucao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completedPoints}/{totalPoints}</p>
            <p className="mt-1 text-sm text-slate-500">pontos concluidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{converted}/{report.leads.length}</p>
            <p className="mt-1 text-sm text-slate-500">leads convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{currency.format(monthRevenue)}</p>
            <p className="mt-1 text-sm text-slate-500">{monthSales.length} vendas no mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prontidao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{readiness}</p>
            <p className="mt-1 text-sm text-slate-500">{readinessScore}/6 criterios atendidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist de prontidao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessChecks.map(([label, ok]) => (
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm" key={String(label)}>
                <span>{label}</span>
                <span className={ok ? "font-medium text-emerald-700" : "font-medium text-slate-400"}>
                  {ok ? "ok" : "pendente"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proximos passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Use estes pontos para organizar a base antes de investir em aquisicao com mais intensidade.
            </p>
            {(pendingReadiness.length ? pendingReadiness : ["Manter rotina de conteudo, atendimento, CRM e acompanhamento de vendas."]).map((item) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" key={String(item)}>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StudioPageShell>
  );
}
