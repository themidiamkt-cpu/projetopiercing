import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getGrowthPlanStartDate } from "@/lib/growth-plan";
import { getAdminUserApprovals, getAppContext } from "@/lib/supabase/queries";

export default async function ConfiguracoesPage() {
  const context = await getAppContext();
  const userApprovalData = context.userRole === "platform_admin"
    ? await getAdminUserApprovals()
    : { users: [], studios: [] };

  return (
    <StudioPageShell title="Configuracoes" eyebrow={context.studioName}>
      <PageHeader
        title="Configuracoes"
        description="Gerencie dados do estudio e conexoes de atendimento."
      />
      <SettingsTabs
        canManageGrowthStartDate={context.userRole === "platform_admin"}
        canManageUserApprovals={context.userRole === "platform_admin"}
        growthPlanStartDate={getGrowthPlanStartDate(context.growthPlanStartDate, context.studioCreatedAt)}
        studios={userApprovalData.studios}
        studioId={context.studioId}
        studioName={context.studioName}
        studioSlug={context.studioSlug}
        userApprovals={userApprovalData.users}
      />
    </StudioPageShell>
  );
}
