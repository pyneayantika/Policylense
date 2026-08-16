import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark" | "ghost";
}

export function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-[#1a6b5a] text-white hover:bg-[#145447] shadow-2xs"
      : variant === "dark"
      ? "bg-[#1a1a1a] text-white hover:bg-black shadow-2xs"
      : variant === "secondary"
      ? "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 shadow-2xs"
      : "bg-transparent text-[#1a6b5a] hover:bg-emerald-50";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
