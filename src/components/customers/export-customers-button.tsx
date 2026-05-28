"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CustomerExportRow = {
  name: string;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
  birth_date?: string | null;
  status: string;
  visits: number;
  completed_visits: number;
  total_spent: number;
  ltv: number;
  last_visit_at?: string | null;
  next_visit_at?: string | null;
};

export function ExportCustomersButton({ rows }: { rows: CustomerExportRow[] }) {
  function exportCustomers() {
    const headers = [
      "Nome",
      "Telefone",
      "Instagram",
      "Email",
      "Aniversario",
      "Status",
      "Quantidade de visitas",
      "Visitas realizadas",
      "Valor total gasto",
      "LTV",
      "Ultima visita",
      "Proxima visita",
    ];
    const csv = [
      headers,
      ...rows.map((row) => [
        row.name,
        row.phone ?? "",
        row.instagram ?? "",
        row.email ?? "",
        formatDate(row.birth_date),
        row.status,
        String(row.visits),
        String(row.completed_visits),
        formatMoney(row.total_spent),
        formatMoney(row.ltv),
        formatDateTime(row.last_visit_at),
        formatDateTime(row.next_visit_at),
      ]),
    ]
      .map((line) => line.map(escapeCsvValue).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button disabled={!rows.length} onClick={exportCustomers} type="button" variant="secondary">
      <Download className="h-4 w-4" />
      Extrair clientes
    </Button>
  );
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "";
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "";
}
