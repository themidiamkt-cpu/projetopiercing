import { PageHeader } from "@/components/pages/page-header";
import { StudioPageShell } from "@/components/pages/studio-page-shell";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getGrowthPlanStartDate } from "@/lib/growth-plan";
import { getAppContext } from "@/lib/supabase/queries";

export default async function ConfiguracoesPage() {
  const context = await getAppContext();

  return (
    <StudioPageShell title="Configuracoes" eyebrow={context.studioName}>
      <PageHeader
        title="Configuracoes"
        description="Gerencie dados do estudio e conexoes de atendimento."
      />
      <SettingsTabs
        canManageGrowthStartDate={context.userRole === "platform_admin"}
        growthPlanStartDate={getGrowthPlanStartDate(context.growthPlanStartDate, context.studioCreatedAt)}
        studioId={context.studioId}
        studioName={context.studioName}
        studioSlug={context.studioSlug}
      />
    </StudioPageShell>
  );
}
