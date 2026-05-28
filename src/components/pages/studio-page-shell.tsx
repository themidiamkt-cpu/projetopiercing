import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getAppContext } from "@/lib/supabase/queries";

export async function StudioPageShell({
  children,
  title,
  eyebrow,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
}) {
  const context = await getAppContext();

  return (
    <AppShell eyebrow={eyebrow} title={title} userEmail={context.userEmail} userRole={context.userRole}>
      {children}
    </AppShell>
  );
}
