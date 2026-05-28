import type { ReactNode } from "react";
import { Bell, LogOut, Search, Sparkles } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  title = "Operacao do estudio",
  eyebrow = "MVP",
  userEmail,
  userRole,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  userEmail?: string;
  userRole?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#E7E5E4]/80 bg-[#F7F7F5]/90 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#B08968]">{eyebrow}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-[#111111]">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-10 items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white/80 px-3 text-sm text-[#6B7280] shadow-[0_10px_30px_rgba(17,17,17,0.03)] md:flex">
                  <Search className="h-4 w-4 stroke-[1.8]" />
                  Buscar cliente, contato ou horario
                </div>
                <Button variant="secondary" aria-label="Notificacoes">
                  <Bell className="h-4 w-4 stroke-[1.8]" />
                </Button>
                <div className="hidden text-right md:block">
                  <p className="text-xs font-medium text-[#111111]">{userEmail}</p>
                  <p className="text-xs text-[#6B7280]">{userRole}</p>
                </div>
                <form action={logout}>
                  <Button variant="secondary" aria-label="Sair" type="submit">
                    <LogOut className="h-4 w-4 stroke-[1.8]" />
                  </Button>
                </form>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {["Visao geral", "Agenda", "Clientes", "Performance"].map((item) => (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280]" key={item}>
                  <Sparkles className="h-3 w-3 text-[#B08968]" />
                  {item}
                </span>
              ))}
            </div>
          </header>
          <div className="flex-1 p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
