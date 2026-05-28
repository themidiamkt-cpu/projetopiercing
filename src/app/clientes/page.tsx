import { createCustomer } from "@/app/actions/studio";
import { CustomerActions } from "@/components/customers/customer-actions";
import { ExportCustomersButton, type CustomerExportRow } from "@/components/customers/export-customers-button";
import { Field, TextArea } from "@/components/forms/field";
import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext, getAppointments, getCustomers, getSales } from "@/lib/supabase/queries";

export default async function ClientesPage() {
  const context = await getAppContext();
  const [customers, appointments, sales] = await Promise.all([
    getCustomers(context.studioId),
    getAppointments(context.studioId),
    getSales(context.studioId),
  ]);
  const customerRows: CustomerExportRow[] = customers.map((customer) => {
    const customerAppointments = appointments.filter((appointment) => appointment.customer_id === customer.id);
    const completedAppointments = customerAppointments.filter((appointment) => appointment.status === "completed");
    const customerSales = sales.filter((sale) => sale.customer_id === customer.id);
    const totalSpent = customerSales.reduce((sum, sale) => sum + Number(sale.amount), 0);

    return {
      name: customer.name,
      phone: customer.phone,
      instagram: customer.instagram,
      email: customer.email,
      birth_date: customer.birth_date,
      status: customer.status,
      visits: customerAppointments.filter((appointment) => appointment.status !== "cancelled").length,
      completed_visits: completedAppointments.length,
      total_spent: totalSpent,
      ltv: totalSpent,
      last_visit_at: customer.last_visit_at,
      next_visit_at: customer.next_visit_at,
    };
  });
  const totalSpent = customerRows.reduce((sum, customer) => sum + customer.total_spent, 0);
  const totalVisits = customerRows.reduce((sum, customer) => sum + customer.visits, 0);

  return (
    <StudioPageShell title="Clientes" eyebrow={context.studioName}>
      <PageHeader
        title="Clientes"
        description="Lista de clientes, aniversarios, ultima visita, proxima visita e dados preparados para anamnese futura."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Base de clientes</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {customers.length} clientes, {totalVisits} visitas e {formatCurrency(totalSpent)} em vendas registradas.
              </p>
            </div>
            <ExportCustomersButton rows={customerRows} />
          </CardHeader>
          <CardContent>
            {customers.length ? (
              <div className="space-y-3">
                {customers.map((customer, index) => {
                  const row = customerRows[index];

                  return (
                    <article
                      className="rounded-2xl border border-[#E7E5E4] bg-white p-4 shadow-[0_12px_35px_rgba(17,17,17,0.04)]"
                      key={customer.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-[#111111]">{customer.name}</h3>
                            <span className="rounded-full bg-[#F3EEE8] px-2.5 py-1 text-xs font-medium text-[#6F5845]">
                              {getStatusLabel(customer.status)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#6B7280]">
                            <span>{customer.phone || "Sem telefone"}</span>
                            <span className="text-[#D6D3D1]">/</span>
                            <span>{customer.instagram || "Sem Instagram"}</span>
                            {customer.email ? (
                              <>
                                <span className="text-[#D6D3D1]">/</span>
                                <span>{customer.email}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-4">
                          <CustomerMetric label="Aniversario" value={formatDate(customer.birth_date)} />
                          <CustomerMetric label="Visitas" value={`${row.visits}`} />
                          <CustomerMetric label="LTV" value={formatCurrency(row.ltv)} />
                          <CustomerMetric label="Proxima visita" value={formatDateTime(customer.next_visit_at)} />
                        </div>

                        <div className="flex justify-end lg:min-w-[88px]">
                          <CustomerActions customer={customer} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-[#F7F7F5] px-4 py-10 text-center text-sm text-[#6B7280]">
                Nenhum cliente cadastrado ainda.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCustomer} className="space-y-3">
              <Field label="Nome" name="name" required />
              <Field label="Telefone" name="phone" />
              <Field label="Instagram" name="instagram" />
              <Field label="Email" name="email" type="email" />
              <Field label="Data de nascimento" name="birth_date" type="date" />
              <Field label="Origem" name="source" />
              <Field label="Tags" name="tags" placeholder="nostril, retorno, vip" />
              <TextArea label="Observacoes" name="notes" />
              <Button type="submit">Cadastrar cliente</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudioPageShell>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status?: string | null) {
  if (status === "inactive") {
    return "Inativa";
  }

  if (status === "blocked") {
    return "Bloqueada";
  }

  return "Ativa";
}

function CustomerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E7E5E4] bg-[#F7F7F5] px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8580]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#111111]">{value}</p>
    </div>
  );
}
