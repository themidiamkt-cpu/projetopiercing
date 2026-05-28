import { CalendarView } from "@/components/calendar/calendar-view";
import { CRMKanban } from "@/components/crm/crm-kanban";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { SimpleChart } from "@/components/dashboard/simple-chart";
import { ExecutionScoreCard } from "@/components/growth/execution-score-card";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppointmentsByMonth, getLeadsByWeek } from "@/lib/dashboard-metrics";
import { getGrowthPlanStartDate, scheduleGrowthItems } from "@/lib/growth-plan";
import { getCustomers, getStudioOverview } from "@/lib/supabase/queries";
import type { Appointment } from "@/types/domain";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getWeekDays() {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function countAppointmentsForDay(appointments: Appointment[], date: Date) {
  const key = date.toISOString().slice(0, 10);
  return appointments.filter((appointment) => appointment.start_time.slice(0, 10) === key).length;
}

export default async function Home() {
  const overview = await getStudioOverview();
  const customers = await getCustomers(overview.studioId);
  const leadsByWeek = getLeadsByWeek(overview.leads);
  const appointmentsByMonth = getAppointmentsByMonth(overview.appointments);
  const weekDays = getWeekDays();
  const today = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = overview.appointments
    .filter((appointment) => appointment.start_time.slice(0, 10) >= today && appointment.status !== "cancelled")
    .slice(0, 4);
  const vipCustomers = customers
    .filter((customer) => Number(customer.lifetime_value ?? 0) > 0 || customer.appointment_count > 1)
    .slice(0, 4);
  const birthdayLeads = overview.leads.filter((lead) => lead.current_stage === "birthday_month").slice(0, 4);
  const warmContacts = overview.leads.filter((lead) => ["new", "no_response", "follow_up_1", "follow_up_2"].includes(lead.current_stage)).slice(0, 4);
  const growthItems = scheduleGrowthItems(
    overview.growthItems,
    getGrowthPlanStartDate(overview.growthPlanStartDate, overview.studioCreatedAt),
  );
  const completedGrowthItems = growthItems.filter((item) => item.status === "done").length;
  const growthPercent = growthItems.length ? Math.round((completedGrowthItems / growthItems.length) * 100) : 0;

  return (
    <AppShell eyebrow={overview.studioName} title="Visao geral" userEmail={overview.userEmail} userRole={overview.userRole}>
      <div className="mx-auto max-w-[1500px] space-y-8">
        <div className="rounded-[28px] border border-[#E7E5E4] bg-white px-6 py-7 shadow-[0_24px_70px_rgba(17,17,17,0.05)] md:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#B08968]">Studio premium em movimento</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#111111] md:text-5xl">
                Uma rotina mais leve para cuidar do estúdio.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6B7280]">
                Agenda, relacionamento e crescimento organizados em uma experiência pensada para estúdios de piercing e body art.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] px-4 py-3 text-sm text-[#6B7280]">
              <span className="block text-xs uppercase tracking-[0.16em] text-[#B08968]">Hoje</span>
              <span className="mt-1 block font-medium text-[#111111]">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span>
            </div>
          </div>
        </div>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <DashboardCards leads={overview.leads} appointments={overview.appointments} sales={overview.sales} />
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Agenda semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const count = countAppointmentsForDay(overview.appointments, day);
                      const isToday = day.toISOString().slice(0, 10) === today;

                      return (
                        <div className={`min-h-28 rounded-2xl border p-3 ${isToday ? "border-[#B08968] bg-[#B08968]/10" : "border-[#E7E5E4] bg-[#F7F7F5]"}`} key={day.toISOString()}>
                          <p className="text-[11px] font-medium uppercase text-[#6B7280]">{day.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                          <p className="mt-1 text-lg font-semibold text-[#111111]">{day.getDate()}</p>
                          <p className="mt-6 text-xs text-[#6B7280]">{count ? `${count} horario${count > 1 ? "s" : ""}` : "Livre"}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Próximos atendimentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(upcomingAppointments.length ? upcomingAppointments : [{ id: "empty", title: "Agenda tranquila por enquanto", start_time: new Date().toISOString(), procedure: "Sem horarios proximos" }]).map((appointment) => (
                    <div className="flex items-center justify-between rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] px-4 py-3" key={appointment.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">{appointment.title}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{appointment.procedure ?? "Atendimento"} · {shortDate(appointment.start_time)}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#B08968]">{formatTime(appointment.start_time)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="space-y-4">
            <ExecutionScoreCard items={growthItems} />
            <Card>
              <CardHeader>
                <CardTitle>Clientes aguardando cuidado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(warmContacts.length ? warmContacts : [{ id: "empty", name: "Nenhum contato pendente", initial_message: "Tudo em dia por aqui." }]).map((lead) => (
                  <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4 text-sm" key={lead.id}>
                    <p className="font-medium text-[#111111]">{lead.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6B7280]">{lead.initial_message ?? "Aguardando proximo passo."}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Clientes VIP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(vipCustomers.length ? vipCustomers : [{ id: "empty", name: "Comece a construir sua base VIP", appointment_count: 0, lifetime_value: 0 }]).map((customer) => (
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4" key={customer.id}>
                  <p className="text-sm font-semibold text-[#111111]">{customer.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{customer.appointment_count} visitas · R$ {Number(customer.lifetime_value ?? 0).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Aniversariantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(birthdayLeads.length ? birthdayLeads : [{ id: "empty", name: "Sem aniversariantes no radar", initial_message: "Quando houver, aparece aqui." }]).map((lead) => (
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4" key={lead.id}>
                  <p className="text-sm font-semibold text-[#111111]">{lead.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{lead.initial_message ?? "Relacionamento do mes"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Insights automáticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4">
                <p className="text-sm font-semibold text-[#111111]">Clientes que podem voltar</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">{overview.leads.filter((lead) => lead.current_stage === "inactive_30_days").length} clientes estão prontos para uma reaproximação delicada.</p>
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4">
                <p className="text-sm font-semibold text-[#111111]">Atendimento em movimento</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">{overview.leads.filter((lead) => lead.status === "converted").length} clientes fechados registrados na jornada.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Crescimento do estúdio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-[-0.03em] text-[#111111]">{growthPercent}%</p>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">Pontuação de execução mede consistência, não promessa de faturamento.</p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#F7F7F5] md:max-w-sm">
                  <div className="h-full rounded-full bg-[#B08968]" style={{ width: `${growthPercent}%` }} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SimpleChart title="Novos contatos por semana" labels={leadsByWeek.labels} values={leadsByWeek.values} />
                <SimpleChart title="Atendimentos por mês" labels={appointmentsByMonth.labels} values={appointmentsByMonth.values} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Divulgação e avaliações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4">
                <p className="text-sm font-semibold text-[#111111]">Divulgação</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">Organize ideias, criativos e campanhas simples sem transformar isso em gestão de tráfego.</p>
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-4">
                <p className="text-sm font-semibold text-[#111111]">Avaliações</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">Peça depoimentos no momento certo e fortaleça sua presença local.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <CRMKanban leads={overview.leads} />

        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <CalendarView appointments={overview.appointments} />
          <CustomerFormModal />
        </section>
      </div>
    </AppShell>
  );
}
