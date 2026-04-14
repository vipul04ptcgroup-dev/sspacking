import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-stone-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-800 placeholder:text-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition',
            error ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white hover:border-stone-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {helpText && !error && <p className="text-xs text-stone-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
