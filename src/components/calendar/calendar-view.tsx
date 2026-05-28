"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, DollarSign, Trash2, X } from "lucide-react";
import { completeAppointmentWithSale, deleteAppointment, updateAppointmentStatus } from "@/app/actions/studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/domain";

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const modes = ["Dia", "Semana", "Mes"] as const;
type CalendarMode = (typeof modes)[number];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function appointmentDate(appointment: Appointment) {
  return new Date(appointment.start_time);
}

function isOpenPastAppointment(appointment: Appointment) {
  return ["scheduled", "confirmed"].includes(appointment.status) && new Date(appointment.end_time).getTime() < Date.now();
}

function statusLabel(status: Appointment["status"]) {
  const labels: Record<Appointment["status"], string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Realizado",
    cancelled: "Cancelado",
    no_show: "Nao compareceu",
  };

  return labels[status];
}

function addPeriod(date: Date, mode: CalendarMode, amount: number) {
  const copy = new Date(date);

  if (mode === "Dia") copy.setDate(copy.getDate() + amount);
  if (mode === "Semana") copy.setDate(copy.getDate() + amount * 7);
  if (mode === "Mes") copy.setMonth(copy.getMonth() + amount);

  return copy;
}

function periodLabel(date: Date, mode: CalendarMode) {
  if (mode === "Dia") {
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  }

  if (mode === "Semana") {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  }

  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const [mode, setMode] = useState<CalendarMode>("Dia");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [cursorDate]);

  function changeMode(nextMode: CalendarMode) {
    setMode(nextMode);
    setSelectedAppointment(null);
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Calendario</CardTitle>
          <p className="mt-1 text-sm capitalize text-slate-500">{periodLabel(cursorDate, mode)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-white p-1">
            <Button
              aria-label="Periodo anterior"
              className="h-7 w-7 p-0"
              onClick={() => setCursorDate((current) => addPeriod(current, mode, -1))}
              type="button"
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              className="h-7 px-2 text-xs"
              onClick={() => setCursorDate(new Date())}
              type="button"
              variant="ghost"
            >
              Hoje
            </Button>
            <Button
              aria-label="Proximo periodo"
              className="h-7 w-7 p-0"
              onClick={() => setCursorDate((current) => addPeriod(current, mode, 1))}
              type="button"
              variant="ghost"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex rounded-md border border-slate-200 p-1 text-xs font-medium text-slate-600">
            {modes.map((item) => (
              <button
                className={cn(
                  "rounded px-2 py-1 transition hover:bg-slate-100",
                  mode === item && "bg-slate-950 text-white hover:bg-slate-950",
                )}
                key={item}
                onClick={() => changeMode(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "Dia" ? (
          <DayView appointments={appointments} date={cursorDate} onSelect={setSelectedAppointment} />
        ) : null}
        {mode === "Semana" ? (
          <WeekView appointments={appointments} days={weekDays} onSelect={setSelectedAppointment} />
        ) : null}
        {mode === "Mes" ? (
          <MonthView appointments={appointments} date={cursorDate} onSelect={setSelectedAppointment} />
        ) : null}
      </CardContent>
      {selectedAppointment ? (
        <AppointmentDetails appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
      ) : null}
    </Card>
  );
}

function DayView({
  appointments,
  date,
  onSelect,
}: {
  appointments: Appointment[];
  date: Date;
  onSelect: (appointment: Appointment) => void;
}) {
  const selectedKey = dateKey(date);

  return (
    <div className="grid gap-2">
      {hours.map((hour) => {
        const hourAppointments = appointments.filter((item) => {
          const itemDate = appointmentDate(item);
          return dateKey(itemDate) === selectedKey && itemDate.getHours() === Number(hour.slice(0, 2));
        });

        return (
          <div className="grid grid-cols-[64px_1fr] gap-3" key={hour}>
            <span className="pt-2 text-xs text-slate-500">{hour}</span>
            <div className="min-h-12 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              {hourAppointments.map((appointment) => (
                <AppointmentPill appointment={appointment} key={appointment.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  appointments,
  days,
  onSelect,
}: {
  appointments: Appointment[];
  days: Date[];
  onSelect: (appointment: Appointment) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayAppointments = appointments.filter((appointment) => dateKey(appointmentDate(appointment)) === dateKey(day));

        return (
          <div className="min-h-48 rounded-md border border-slate-200 bg-slate-50 p-2" key={dateKey(day)}>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
            </p>
            <div className="mt-2 space-y-2">
              {dayAppointments.map((appointment) => (
                <AppointmentPill appointment={appointment} compact key={appointment.id} onSelect={onSelect} />
              ))}
              {!dayAppointments.length ? <p className="text-xs text-slate-400">Livre</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  appointments,
  date,
  onSelect,
}: {
  appointments: Appointment[];
  date: Date;
  onSelect: (appointment: Appointment) => void;
}) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const offset = firstDay.getDay();
  const cells = Array.from({ length: totalDays + offset }, (_, index) => {
    if (index < offset) return null;
    return new Date(date.getFullYear(), date.getMonth(), index - offset + 1);
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {cells.map((cell, index) => {
        if (!cell) {
          return <div className="min-h-24 rounded-md bg-slate-50" key={`empty-${index}`} />;
        }

        const dayAppointments = appointments.filter((appointment) => dateKey(appointmentDate(appointment)) === dateKey(cell));

        return (
          <div className="min-h-24 rounded-md border border-slate-200 bg-slate-50 p-2" key={dateKey(cell)}>
            <p className="text-xs font-semibold text-slate-600">{cell.getDate()}</p>
            <div className="mt-2 space-y-1">
              {dayAppointments.slice(0, 2).map((appointment) => (
                <AppointmentPill appointment={appointment} compact key={appointment.id} onSelect={onSelect} />
              ))}
              {dayAppointments.length > 2 ? (
                <p className="text-xs font-medium text-slate-500">+{dayAppointments.length - 2}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppointmentPill({
  appointment,
  compact,
  onSelect,
}: {
  appointment: Appointment;
  compact?: boolean;
  onSelect: (appointment: Appointment) => void;
}) {
  const overdue = isOpenPastAppointment(appointment);
  const isCompleted = appointment.status === "completed";
  const isNoShow = appointment.status === "no_show";
  const isCancelled = appointment.status === "cancelled";

  return (
    <button
      className={cn(
        "w-full rounded-md border px-3 py-2 text-left text-sm transition",
        overdue && "border-red-200 bg-red-100 text-red-950 hover:bg-red-200",
        isCompleted && "border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200",
        isNoShow && "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
        isCancelled && "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200",
        !overdue && !isCompleted && !isNoShow && !isCancelled && "border-sky-200 bg-sky-100 text-sky-950 hover:bg-sky-200",
      )}
      onClick={() => onSelect(appointment)}
      type="button"
    >
      <strong className={cn(compact && "block truncate text-xs")}>{appointment.title}</strong>
      {!compact ? (
        <span className={cn("ml-2", overdue ? "text-red-700" : "text-slate-600")}>{appointment.procedure}</span>
      ) : null}
      {overdue ? <span className="ml-2 text-xs font-semibold text-red-700">Pendente</span> : null}
    </button>
  );
}

function AppointmentDetails({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const [showSaleForm, setShowSaleForm] = useState(false);

  async function handleComplete(formData: FormData) {
    await completeAppointmentWithSale(formData);
    onClose();
    window.location.reload();
  }

  async function handleNoShow(formData: FormData) {
    await updateAppointmentStatus(formData);
    onClose();
    window.location.reload();
  }

  async function handleDelete(formData: FormData) {
    await deleteAppointment(formData);
    onClose();
    window.location.reload();
  }

  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const overdue = isOpenPastAppointment(appointment);
  const defaultDescription = appointment.procedure ?? appointment.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarClock className="h-4 w-4" />
              Detalhes do agendamento
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{appointment.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
          </div>
          <Button aria-label="Fechar detalhes" className="h-8 w-8 p-0" onClick={onClose} type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-4">
          {overdue ? (
            <div className="mb-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Este horario ja passou e ainda nao foi marcado como realizado ou nao compareceu.</p>
            </div>
          ) : null}
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <Detail label="Procedimento" value={appointment.procedure ?? "-"} />
            <Detail label="Status" value={statusLabel(appointment.status)} />
            <Detail label="Inicio" value={start.toLocaleString("pt-BR")} />
            <Detail label="Fim" value={end.toLocaleString("pt-BR")} />
            <Detail label="Duracao" value={`${durationMinutes} min`} />
            <Detail label="Cliente vinculado" value={appointment.customer_id ? "Sim" : "Nao"} />
            <Detail label="ID do cliente" value={appointment.customer_id ?? "-"} />
            <Detail label="ID do lead" value={appointment.lead_id ?? "-"} />
          </div>
          {appointment.notes ? (
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Observacoes</p>
              <p className="whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          ) : null}
          {appointment.status !== "completed" && appointment.status !== "cancelled" ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowSaleForm((current) => !current)} type="button">
                  <CheckCircle2 className="h-4 w-4" />
                  Realizado
                </Button>
                <form action={handleNoShow}>
                  <input name="appointment_id" type="hidden" value={appointment.id} />
                  <input name="status" type="hidden" value="no_show" />
                  <Button type="submit" variant="secondary">
                    Nao compareceu
                  </Button>
                </form>
              </div>
              {showSaleForm ? (
                <form action={handleComplete} className="mt-3 grid gap-3 rounded-md border border-emerald-200 bg-white p-3 md:grid-cols-2">
                  <input name="appointment_id" type="hidden" value={appointment.id} />
                  <label className="text-sm font-medium text-slate-700">
                    Valor total
                    <div className="mt-1 flex items-center rounded-md border border-slate-200 bg-white px-3">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <input
                        className="h-10 w-full bg-transparent px-2 outline-none"
                        min="0"
                        name="amount"
                        placeholder="250,00"
                        required
                        step="0.01"
                        type="number"
                      />
                    </div>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Forma de pagamento
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400"
                      name="payment_method"
                      placeholder="Pix, credito, dinheiro"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 md:col-span-2">
                    Descricao da venda
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400"
                      defaultValue={defaultDescription}
                      name="description"
                    />
                  </label>
                  <div className="flex justify-end md:col-span-2">
                    <Button type="submit">Salvar venda e concluir</Button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button onClick={onClose} type="button" variant="ghost">
              Fechar
            </Button>
            <form action={handleDelete}>
              <input name="appointment_id" type="hidden" value={appointment.id} />
              <Button className="text-red-700 hover:bg-red-50" type="submit" variant="ghost">
                <Trash2 className="h-4 w-4" />
                Excluir agendamento
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}
