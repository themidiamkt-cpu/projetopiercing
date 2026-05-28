import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08968]",
        variant === "primary" && "bg-[#1E1E1B] text-white shadow-[0_10px_30px_rgba(30,30,27,0.12)] hover:bg-[#2A2A26]",
        variant === "secondary" && "border border-[#E7E5E4] bg-white text-[#111111] hover:border-[#D6D3D1] hover:bg-[#FBFBFA]",
        variant === "ghost" && "text-[#4B5563] hover:bg-[#EFEDEA] hover:text-[#111111]",
        className,
      )}
      {...props}
    />
  );
}
