import { SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 text-stone-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin h-5 w-5 text-amber-600', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm font-medium text-stone-700">{label}</label>}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-800 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition',
          error ? 'border-red-400' : 'border-stone-300 hover:border-stone-400',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm font-medium text-stone-700">{label}</label>}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-800 bg-white resize-y min-h-[100px]',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition',
          error ? 'border-red-400' : 'border-stone-300 hover:border-stone-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-stone-200 shadow-sm', className)}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
      {subtitle && <p className="mt-1 text-stone-500">{subtitle}</p>}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-stone-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-stone-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-stone-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-stone-100">
            <h2 className="text-xl font-bold text-stone-900">{title}</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
