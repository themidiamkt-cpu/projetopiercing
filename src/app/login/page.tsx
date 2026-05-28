import { redirect } from "next/navigation";
import { LockKeyhole, LogIn } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-md bg-cyan-50 p-3 text-cyan-700">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Piercing Growth</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Entrar no Studio OS</h1>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <form action={login} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Email
            <input
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
              name="email"
              placeholder="voce@email.com"
              required
              type="email"
            />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Senha
            <input
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
              name="password"
              placeholder="Sua senha"
              required
              type="password"
            />
          </label>
          <Button className="w-full" type="submit">
            <LogIn className="h-4 w-4" />
            Entrar
          </Button>
        </form>
      </section>
    </main>
  );
}
