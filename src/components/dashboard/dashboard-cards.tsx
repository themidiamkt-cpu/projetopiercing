import { CalendarCheck2, Clock3, DollarSign, HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Appointment, Lead, Sale } from "@/types/domain";

type DashboardCardsProps = {
  leads: Lead[];
  appointments: Appointment[];
  sales: Sale[];
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function DashboardCards({ leads, appointments, sales }: DashboardCardsProps) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const monthSales = sales.filter((sale) => sale.sale_date.slice(0, 7) === currentMonth);
  const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.amount), 0);
  const metrics = [
    {
      label: "Agenda de hoje",
      value: appointments.filter((appointment) => appointment.start_time.slice(0, 10) === today).length,
      hint: "atendimentos previstos",
      icon: CalendarCheck2,
    },
    {
      label: "Clientes aguardando",
      value: leads.filter((lead) => ["new", "no_response", "follow_up_1", "follow_up_2"].includes(lead.current_stage)).length,
      hint: "precisam de carinho no atendimento",
      icon: Clock3,
    },
    {
      label: "Faturamento",
      value: currency(monthRevenue),
      hint: `${monthSales.length} vendas no mes`,
      icon: DollarSign,
    },
    {
      label: "Retornos",
      value: leads.filter((lead) => lead.current_stage === "return_7_days").length,
      hint: "cuidados pos-procedimento",
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card className="min-w-0" key={metric.label}>
          <CardContent className="flex min-h-40 flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-full bg-[#F7F7F5] p-2 text-[#B08968]">
                <metric.icon className="h-4 w-4 stroke-[1.8]" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#6B7280]">{metric.label}</p>
              <p className="mt-3 break-words text-4xl font-semibold tracking-[-0.03em] text-[#111111]">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-[#6B7280]">{metric.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
