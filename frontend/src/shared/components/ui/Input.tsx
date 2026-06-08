import { type InputHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={twMerge(
            "w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-sm",
            "text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300 dark:border-gray-600",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
