import type { GrowthItem } from "@/lib/supabase/queries";

const dueDayByWeek: Record<number, number> = {
  1: 5,
  2: 12,
  3: 19,
  4: 26,
};

export type ScheduledGrowthItem = GrowthItem & {
  due_date: string;
  due_label: string;
  days_until_due: number;
  is_overdue: boolean;
};

export function getGrowthPlanStartDate(growthPlanStartDate?: string | null, studioCreatedAt?: string | null) {
  return (growthPlanStartDate ?? studioCreatedAt ?? new Date().toISOString()).slice(0, 10);
}

export function getCurrentPlanMonth(startDate: string) {
  const start = parseDate(startDate);
  const today = startOfDay(new Date());
  const elapsedDays = Math.floor((today.getTime() - start.getTime()) / 86400000);

  if (elapsedDays < 0) {
    return 1;
  }

  return Math.min(3, Math.floor(elapsedDays / 30) + 1) as 1 | 2 | 3;
}

export function getCurrentPlanDay(startDate: string) {
  const start = parseDate(startDate);
  const today = startOfDay(new Date());
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
}

export function scheduleGrowthItems(items: GrowthItem[], startDate: string): ScheduledGrowthItem[] {
  const today = startOfDay(new Date());

  return items.map((item) => {
    const dueDate = addDays(parseDate(startDate), (item.month_number - 1) * 30 + (dueDayByWeek[item.suggested_week] ?? 5));
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

    return {
      ...item,
      due_date: toDateInputValue(dueDate),
      due_label: dueDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      days_until_due: daysUntilDue,
      is_overdue: item.status !== "done" && daysUntilDue < 0,
    };
  });
}

export function getMonthlyExecution(items: ScheduledGrowthItem[], currentMonth: number) {
  const monthItems = items.filter((item) => item.month_number === currentMonth);
  const total = monthItems.reduce((sum, item) => sum + item.points, 0);
  const done = monthItems.filter((item) => item.status === "done").reduce((sum, item) => sum + item.points, 0);

  return {
    items: monthItems,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
