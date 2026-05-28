"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  DollarSign,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Visao geral", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: ContactRound },
  { label: "Clientes", href: "/clientes", icon: UsersRound },
  { label: "Agenda", href: "/calendario", icon: CalendarDays },
  { label: "Faturamento", href: "/vendas", icon: DollarSign },
  { label: "Plano de Crescimento", href: "/plano", icon: CheckCircle2 },
  { label: "Performance", href: "/relatorios", icon: BarChart3 },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 bg-[#1E1E1B] px-4 py-5 text-white lg:block">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">SaaS premium</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.01em] text-white">Estudio lucrativo</h1>
        <p className="mt-2 text-xs leading-5 text-white/45">Atendimento, agenda e crescimento com estética de estúdio premium.</p>
      </div>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/58 transition hover:bg-white/[0.06] hover:text-white",
                active && "bg-white text-[#1E1E1B] shadow-[0_14px_30px_rgba(0,0,0,0.18)] hover:bg-white hover:text-[#1E1E1B]",
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4 stroke-[1.8]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
