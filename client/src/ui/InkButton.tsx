import type { ButtonHTMLAttributes, ReactNode } from "react";

interface InkButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> {
  children: ReactNode;
}

export function InkButton({ children, ...props }: InkButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className="group flex items-center justify-center gap-2 border-none cursor-pointer select-none rounded-xl px-[18px] py-[14px] text-sm bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)] active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-btn-primary)] disabled:cursor-not-allowed transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]"
      style={{ fontWeight: 700, letterSpacing: "-0.005em", WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
}
