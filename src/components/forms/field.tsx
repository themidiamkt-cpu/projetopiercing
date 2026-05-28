import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, ...props }: FieldProps) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#374151]">
      {label}
      <input
        className="h-10 w-full rounded-xl border border-[#E7E5E4] bg-white px-3 text-sm text-[#111111] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#B08968] focus:ring-4 focus:ring-[#B08968]/10"
        {...props}
      />
    </label>
  );
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#374151]">
      {label}
      <textarea
        className="min-h-24 w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#B08968] focus:ring-4 focus:ring-[#B08968]/10"
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#374151]">
      {label}
      <select
        className="h-10 w-full rounded-xl border border-[#E7E5E4] bg-white px-3 text-sm text-[#111111] outline-none transition focus:border-[#B08968] focus:ring-4 focus:ring-[#B08968]/10"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
