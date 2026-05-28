"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteCustomer, updateCustomer } from "@/app/actions/studio";
import { Field, Select, TextArea } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/types/domain";

export function CustomerActions({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);

  async function handleUpdateCustomer(formData: FormData) {
    await updateCustomer(formData);
    setOpen(false);
  }

  return (
    <>
      <Button className="h-8 px-2 text-xs" onClick={() => setOpen(true)} type="button" variant="secondary">
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Editar cliente</h2>
                <p className="mt-1 text-sm text-slate-500">Atualize os dados do cadastro ou exclua este cliente.</p>
              </div>
              <Button aria-label="Fechar" className="h-8 w-8 p-0" onClick={() => setOpen(false)} type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <form action={handleUpdateCustomer} className="space-y-4" id={`edit-customer-${customer.id}`}>
                <input name="customer_id" type="hidden" value={customer.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field defaultValue={customer.name} label="Nome" name="name" required />
                  <Field defaultValue={customer.phone ?? ""} label="Telefone" name="phone" />
                  <Field defaultValue={customer.instagram ?? ""} label="Instagram" name="instagram" />
                  <Field defaultValue={customer.email ?? ""} label="Email" name="email" type="email" />
                  <Field defaultValue={customer.birth_date ?? ""} label="Data de nascimento" name="birth_date" type="date" />
                  <Field defaultValue={customer.source ?? ""} label="Origem" name="source" />
                  <Field defaultValue={customer.tags.join(", ")} label="Tags" name="tags" placeholder="nostril, retorno, vip" />
                  <Select defaultValue={customer.status} label="Status" name="status">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="blocked">Bloqueado</option>
                  </Select>
                </div>
                <TextArea defaultValue={customer.notes ?? ""} label="Observacoes" name="notes" />
              </form>
              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <DeleteCustomerForm customerId={customer.id} onDeleted={() => setOpen(false)} />
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                    Cancelar
                  </Button>
                  <Button form={`edit-customer-${customer.id}`} type="submit">Salvar</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DeleteCustomerForm({ customerId, onDeleted }: { customerId: string; onDeleted: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDeleteCustomer(formData: FormData) {
    await deleteCustomer(formData);
    onDeleted();
  }

  if (!confirmDelete) {
    return (
      <Button
        className="text-red-700 hover:bg-red-50"
        onClick={() => setConfirmDelete(true)}
        type="button"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    );
  }

  return (
    <form action={handleDeleteCustomer} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input name="customer_id" type="hidden" value={customerId} />
      <span className="text-sm text-red-700">Confirmar exclusao?</span>
      <Button className="bg-red-700 hover:bg-red-800" type="submit">
        Excluir cliente
      </Button>
      <Button onClick={() => setConfirmDelete(false)} type="button" variant="ghost">
        Voltar
      </Button>
    </form>
  );
}
