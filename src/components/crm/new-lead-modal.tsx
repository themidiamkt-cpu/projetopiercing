"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createLead } from "@/app/actions/studio";
import { Field, TextArea } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

export function NewLeadModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        <Plus className="h-4 w-4" />
        Novo contato
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#E7E5E4] bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E4] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">Novo contato</h2>
                <p className="mt-1 text-sm text-[#6B7280]">Cadastre uma conversa recebida fora da automacao.</p>
              </div>
              <Button aria-label="Fechar" className="h-8 w-8 p-0" onClick={() => setOpen(false)} type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form action={createLead} className="space-y-3 px-5 py-4">
              <Field label="Nome" name="name" required />
              <Field label="Telefone" name="phone" />
              <Field label="Instagram" name="instagram" />
              <Field label="Origem" name="source" placeholder="Instagram, WhatsApp, Site" />
              <TextArea label="Mensagem inicial" name="initial_message" />
              <div className="flex justify-end gap-2 border-t border-[#E7E5E4] pt-4">
                <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                  Cancelar
                </Button>
                <Button type="submit">
                  <Plus className="h-4 w-4" />
                  Criar contato
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
