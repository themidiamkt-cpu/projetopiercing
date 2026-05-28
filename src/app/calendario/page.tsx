import { createAppointment } from "@/app/actions/studio";
import { AppointmentStatusControl } from "@/components/calendar/appointment-status-control";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Field, Select, TextArea } from "@/components/forms/field";
import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext, getAppointments, getCustomers } from "@/lib/supabase/queries";

function isOpenPastAppointment(appointment: { end_time: string; status: string }) {
  return ["scheduled", "confirmed"].includes(appointment.status) && new Date(appointment.end_time).getTime() < Date.now();
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Realizado",
    cancelled: "Cancelado",
    no_show: "Nao compareceu",
  };

  return labels[status] ?? status;
}

export default async function CalendarioPage() {
  const context = await getAppContext();
  const [appointments, customers] = await Promise.all([
    getAppointments(context.studioId),
    getCustomers(context.studioId),
  ]);

  return (
    <StudioPageShell title="Calendario" eyebrow={context.studioName}>
      <PageHeader
        title="Calendario"
        description="Agenda operacional com vinculo ao cliente, status do atendimento e bloqueio de horarios ja ocupados."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <CalendarView appointments={appointments} />
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.map((appointment) => {
                const overdue = isOpenPastAppointment(appointment);

                return (
                  <div
                    className={`flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between ${
                      overdue ? "border-red-200 bg-red-50" : "border-slate-200"
                    }`}
                    key={appointment.id}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{appointment.title}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(appointment.start_time).toLocaleString("pt-BR")} - {appointment.procedure}
                      </p>
                      <p className={overdue ? "text-sm font-semibold text-red-700" : "text-sm text-slate-500"}>
                        {overdue ? "Pendente: marque como realizado ou nao compareceu no popup do calendario." : statusLabel(appointment.status)}
                      </p>
                    </div>
                    <AppointmentStatusControl appointment={appointment} key={`${appointment.id}-${appointment.status}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Novo agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAppointment} className="space-y-3">
              <Select label="Cliente" name="customer_id">
                <option value="">Sem cliente vinculado</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
              <Field label="Titulo" name="title" required />
              <Field label="Procedimento" name="procedure" />
              <Field label="Inicio" name="start_time" required type="datetime-local" />
              <Field defaultValue={60} label="Duracao em minutos" min={15} name="duration_minutes" step={15} type="number" />
              <p className="text-xs text-slate-500">Se o horario ja estiver ocupado, o agendamento nao sera criado.</p>
              <TextArea label="Observacoes" name="notes" />
              <Button type="submit">Criar agendamento</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudioPageShell>
  );
}
