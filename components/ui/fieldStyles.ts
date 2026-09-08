export const formLabelClassName =
  "mb-2 block text-sm text-brand-gray sm:text-[15px]";

export const formInputClassName =
  "w-full rounded-xl border border-brand-border-light bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-brand-gray/50 focus:border-brand-primary sm:text-[15px]";

export const formInputErrorClassName = "border-brand-error focus:border-brand-error";

export const formFieldErrorClassName =
  "mt-1.5 text-xs font-medium text-brand-error-strong sm:text-sm";

export function getFormControlClassName(hasError: boolean, className = "") {
  return `${formInputClassName}${hasError ? ` ${formInputErrorClassName}` : ""}${className ? ` ${className}` : ""}`.trim();
}
