import { createSale } from "@/app/actions/studio";
import { Field, Select, TextArea } from "@/components/forms/field";
import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext, getCustomers, getSales } from "@/lib/supabase/queries";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function VendasPage() {
  const context = await getAppContext();
  const [customers, sales] = await Promise.all([
    getCustomers(context.studioId),
    getSales(context.studioId),
  ]);
  const customersById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSales = sales.filter((sale) => sale.sale_date.slice(0, 7) === currentMonth);
  const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.amount), 0);

  return (
    <StudioPageShell title="Vendas" eyebrow={context.studioName}>
      <PageHeader
        title="Vendas"
        description="Lance data, cliente e valor da venda. Esses dados alimentam o dashboard e os relatorios comerciais."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Vendas no mes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{monthSales.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Receita no mes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{currency(monthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Ticket medio</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {currency(monthSales.length ? monthRevenue / monthSales.length : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Historico de vendas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-2">Data</th>
                  <th>Cliente</th>
                  <th>Descricao</th>
                  <th>Pagamento</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr className="border-b border-slate-100" key={sale.id}>
                    <td className="py-3">{new Date(`${sale.sale_date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="font-medium text-slate-900">
                      {sale.customer_id ? customersById.get(sale.customer_id) ?? "Cliente removido" : "Sem cliente"}
                    </td>
                    <td>{sale.description ?? "-"}</td>
                    <td>{sale.payment_method ?? "-"}</td>
                    <td className="text-right font-semibold text-slate-950">{currency(Number(sale.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lancar venda</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSale} className="space-y-3">
              <Field defaultValue={new Date().toISOString().slice(0, 10)} label="Data" name="sale_date" required type="date" />
              <Select label="Cliente" name="customer_id">
                <option value="">Sem cliente vinculado</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
              <Field label="Valor da venda" min="0" name="amount" placeholder="250,00" required step="0.01" type="number" />
              <Field label="Forma de pagamento" name="payment_method" placeholder="Pix, credito, dinheiro" />
              <TextArea label="Descricao" name="description" placeholder="Procedimento, joia, retorno..." />
              <Button type="submit">Salvar venda</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudioPageShell>
  );
}
