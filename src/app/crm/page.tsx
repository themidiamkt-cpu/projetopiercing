import { CRMKanban } from "@/components/crm/crm-kanban";
import { NewLeadModal } from "@/components/crm/new-lead-modal";
import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { getAppContext, getLeads } from "@/lib/supabase/queries";

export default async function CRMPage() {
  const context = await getAppContext();
  const leads = await getLeads(context.studioId);

  return (
    <StudioPageShell title="CRM" eyebrow={context.studioName}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="CRM"
          description="Acompanhe novos contatos, cuide dos retornos e transforme conversas em clientes fechados com cadastro e agenda."
        />
        <NewLeadModal />
      </div>
      <div className="w-full">
        <CRMKanban leads={leads} />
      </div>
    </StudioPageShell>
  );
}
