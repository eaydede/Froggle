import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonMode = 'light' | 'dark';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mode?: ButtonMode;
  fullWidth?: boolean;
  children: ReactNode;
}

const FONT: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  WebkitTapHighlightColor: 'transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'py-2 px-6 text-sm',
  md: 'py-3 px-7 text-[0.85rem]',
  lg: 'py-3.5 px-8 text-[0.85rem]',
};

const RADIUS_CLASSES: Record<ButtonSize, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
};

function getVariantClasses(variant: ButtonVariant, mode: ButtonMode): string {
  switch (variant) {
    case 'primary':
      if (mode === 'dark') {
        return [
          'bg-[#FAF8F5] text-[#2C2C2E] border-none',
          'hover:bg-[#F0EDE8]',
          'active:scale-[0.975] active:duration-[60ms]',
        ].join(' ');
      }
      return [
        'bg-[var(--accent)] text-white border-none',
        'hover:bg-[var(--accent-hover)]',
        'active:scale-[0.975] active:duration-[60ms]',
      ].join(' ');

    case 'secondary':
      if (mode === 'dark') {
        return [
          'bg-white/15 text-white border-none',
          'hover:bg-white/25',
          'active:scale-[0.975] active:duration-[60ms]',
        ].join(' ');
      }
      return [
        'bg-[var(--track)] text-[var(--text)] border-none',
        'hover:bg-[#ddd]',
        'active:scale-[0.975] active:duration-[60ms]',
      ].join(' ');

    case 'tertiary':
      if (mode === 'dark') {
        return [
          'bg-transparent text-white/70 border border-white/25',
          'hover:text-white hover:border-white/40',
        ].join(' ');
      }
      return [
        'bg-transparent text-[var(--text-muted)] border border-[#ddd]',
        'hover:text-[var(--text-mid)] hover:border-[#aaa]',
      ].join(' ');
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  mode = 'light',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variantClasses = getVariantClasses(variant, mode);
  const sizeClasses = SIZE_CLASSES[size];
  const radiusClasses = RADIUS_CLASSES[size];

  return (
    <button
      className={`
        ${variantClasses}
        ${sizeClasses}
        ${radiusClasses}
        ${fullWidth ? 'w-full' : ''}
        cursor-pointer select-none
        transition-all duration-200
        inline-flex items-center justify-center gap-2
        ${className}
      `}
      style={FONT}
      {...props}
    >
      {children}
    </button>
  );
}
