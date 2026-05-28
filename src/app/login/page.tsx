import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, LockKeyhole, LogIn, UsersRound } from "lucide-react";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F7F5] p-4 text-[#111111] sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#E7E5E4] bg-white shadow-[0_28px_80px_rgba(17,17,17,0.08)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden bg-[#1E1E1B] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">Estudio lucrativo</p>
            <h1 className="mt-4 max-w-md text-5xl font-semibold leading-[1.02] tracking-[-0.01em]">
              Estudio lucrativo
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/52">
              Atendimento, agenda, CRM e crescimento em uma experiencia pensada para estudios de piercing.
            </p>
          </div>

          <div className="grid gap-3">
            <LoginFeature icon={UsersRound} label="Clientes organizadas" />
            <LoginFeature icon={CalendarDays} label="Agenda sem conflito de horarios" />
            <LoginFeature icon={CheckCircle2} label="Plano de crescimento acompanhado" />
          </div>

          <div />
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-5 inline-flex rounded-2xl border border-[#E7E5E4] bg-[#F7F7F5] p-3 text-[#B08968]">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B08968]">Estudio lucrativo</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.01em] text-[#111111]">Entrar no painel</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                Acesse sua agenda, CRM, clientes e plano de crescimento do estudio.
              </p>
            </div>

            {params.error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {params.error}
              </div>
            ) : null}

            <form action={login} className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-[#374151]">
                Email
                <input
                  className="h-12 w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 text-sm outline-none transition focus:border-[#B08968] focus:ring-4 focus:ring-[#B08968]/10"
                  name="email"
                  placeholder="voce@email.com"
                  required
                  type="email"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium text-[#374151]">
                Senha
                <input
                  className="h-12 w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 text-sm outline-none transition focus:border-[#B08968] focus:ring-4 focus:ring-[#B08968]/10"
                  name="password"
                  placeholder="Sua senha"
                  required
                  type="password"
                />
              </label>
              <Button className="h-12 w-full rounded-2xl" type="submit">
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginFeature({ icon: Icon, label }: { icon: typeof UsersRound; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72">
      <Icon className="h-4 w-4 text-[#B08968]" />
      {label}
    </div>
  );
}
