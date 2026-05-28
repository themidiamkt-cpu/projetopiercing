import type { Appointment, Lead } from "@/types/domain";

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function getLeadsByWeek(leads: Lead[]) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const values = [0, 0, 0, 0, 0];

  leads.forEach((lead) => {
    const createdAt = new Date(lead.created_at);

    if (createdAt.getMonth() !== month || createdAt.getFullYear() !== year) {
      return;
    }

    const weekIndex = Math.min(Math.floor((createdAt.getDate() - 1) / 7), 4);
    values[weekIndex] += 1;
  });

  return {
    labels: ["S1", "S2", "S3", "S4", "S5"],
    values,
  };
}

export function getAppointmentsByMonth(appointments: Appointment[]) {
  const now = new Date();
  const buckets = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabels[date.getMonth()],
      value: 0,
    };
  });

  appointments.forEach((appointment) => {
    const date = new Date(appointment.start_time);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((item) => item.key === key);

    if (bucket) {
      bucket.value += 1;
    }
  });

  return {
    labels: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => bucket.value),
  };
}
