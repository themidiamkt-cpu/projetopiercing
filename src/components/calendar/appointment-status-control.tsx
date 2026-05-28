"use client";

import { useState } from "react";
import { DollarSign, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeAppointmentWithSale, updateAppointmentStatus } from "@/app/actions/studio";
import { Button } from "@/components/ui/button";
import type { Appointment, AppointmentStatus } from "@/types/domain";

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Realizado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Nao compareceu" },
];

export function AppointmentStatusControl({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>(appointment.status);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusUpdate(formData: FormData) {
    setIsSaving(true);
    setError(null);

    const result = await updateAppointmentStatus(formData);

    if (result?.ok === false) {
      setError(result.error ?? "Nao foi possivel atualizar o status.");
      setIsSaving(false);
      return;
    }

    router.refresh();
    setIsSaving(false);
  }

  async function handleComplete(formData: FormData) {
    setIsSaving(true);
    setError(null);
    await completeAppointmentWithSale(formData);
    setShowSaleModal(false);
    router.refresh();
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form
        action={selectedStatus === "completed" ? undefined : handleStatusUpdate}
        className="flex gap-2"
        onSubmit={(event) => {
          if (selectedStatus === "completed") {
            event.preventDefault();
            setShowSaleModal(true);
          }
        }}
      >
        <input name="appointment_id" type="hidden" value={appointment.id} />
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          name="status"
          onChange={(event) => {
            const nextStatus = event.target.value as AppointmentStatus;
            setSelectedStatus(nextStatus);

            if (nextStatus === "completed") {
              setShowSaleModal(true);
            }
          }}
          value={selectedStatus}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {isSaving ? "Atualizando..." : "Atualizar"}
        </Button>
      </form>
      {error ? <p className="max-w-[260px] text-right text-xs font-medium text-red-700">{error}</p> : null}

      {showSaleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E7E5E4] bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E5E4] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">Registrar atendimento realizado</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Informe o valor para alimentar o faturamento e o histórico da cliente.
                </p>
              </div>
              <Button
                aria-label="Fechar"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedStatus(appointment.status);
                }}
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form action={handleComplete} className="space-y-4 px-5 py-4">
              <input name="appointment_id" type="hidden" value={appointment.id} />
              <label className="block text-sm font-medium text-[#374151]">
                Valor total
                <div className="mt-1 flex items-center rounded-xl border border-[#E7E5E4] bg-white px-3">
                  <DollarSign className="h-4 w-4 text-[#8A8580]" />
                  <input
                    className="h-11 w-full bg-transparent px-2 outline-none"
                    min="0"
                    name="amount"
                    placeholder="250,00"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-[#374151]">
                Forma de pagamento
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-[#E7E5E4] px-3 outline-none focus:border-[#B08968]"
                  name="payment_method"
                  placeholder="Pix, credito, dinheiro"
                />
              </label>
              <label className="block text-sm font-medium text-[#374151]">
                Descricao da venda
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-[#E7E5E4] px-3 outline-none focus:border-[#B08968]"
                  defaultValue={appointment.procedure ?? appointment.title}
                  name="description"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <Button
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedStatus(appointment.status);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar venda e concluir</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
