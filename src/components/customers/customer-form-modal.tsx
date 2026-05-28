import { CalendarPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomerFormModal() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulario obrigatorio ao converter lead</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {["Nome", "Telefone", "Instagram", "Aniversario", "Data do agendamento", "Procedimento"].map((label) => (
          <label className="space-y-1 text-sm font-medium text-slate-700" key={label}>
            {label}
            <input
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              placeholder={label}
            />
          </label>
        ))}
        <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
          Observacoes
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Preferencias, joia, restricoes e contexto do atendimento"
          />
        </label>
        <div className="flex gap-2 md:col-span-2">
          <Button>
            <Save className="h-4 w-4" />
            Salvar cliente
          </Button>
          <Button variant="secondary">
            <CalendarPlus className="h-4 w-4" />
            Criar agendamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
