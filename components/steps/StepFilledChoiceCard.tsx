import Image from "next/image";
import { cn } from "@/lib/cn";

type StepFilledChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  icon?: string;
  reserveIconSpace?: boolean;
  className?: string;
};

export default function StepFilledChoiceCard({
  label,
  selected,
  onSelect,
  icon,
  reserveIconSpace = false,
  className,
}: StepFilledChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-sm transition-[color,background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none sm:gap-4 sm:px-5 sm:py-4",
        selected
          ? "border-brand-light bg-brand-light text-white scale-[1.02] motion-reduce:scale-100"
          : "border-brand-border-light/60 bg-white text-brand-ink hover:border-brand-lavender",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-white bg-white"
            : "border-brand-border-light bg-white",
        )}
      >
        {selected ? (
          <span className="h-2.5 w-2.5 rounded-full bg-brand-light" />
        ) : null}
      </span>

      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10">
          <Image
            src={icon}
            alt=""
            width={36}
            height={36}
            className={cn(
              "h-8 w-8 object-contain sm:h-9 sm:w-9",
              selected ? "brightness-0 invert" : "",
            )}
          />
        </span>
      ) : reserveIconSpace ? (
        <span className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      ) : null}

      <span className="flex-1 text-base sm:text-[1.05rem]">{label}</span>
    </button>
  );
}

type StepFilledCheckboxCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
};

export function StepFilledCheckboxCard({
  label,
  selected,
  onSelect,
  className,
}: StepFilledCheckboxCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition-[color,background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none sm:px-5 sm:py-3.5",
        selected
          ? "border-brand-light bg-brand-light text-white scale-[1.02] motion-reduce:scale-100"
          : "border-brand-border-light/60 bg-white text-brand-ink hover:border-brand-lavender",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          selected
            ? "border-white bg-white"
            : "border-brand-border-light bg-white",
        )}
      >
        {selected ? (
          <svg
            aria-hidden
            viewBox="0 0 12 10"
            className="h-2.5 w-3 text-brand-light"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 5.2L4.2 8.4L11 1.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="text-sm sm:text-[0.9375rem]">{label}</span>
    </button>
  );
}

type StepRadioChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
};

export function StepRadioChoiceCard({
  label,
  selected,
  onSelect,
  className,
}: StepRadioChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition-[color,background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none sm:px-5 sm:py-3.5",
        selected
          ? "border-brand-light bg-brand-light text-white scale-[1.02] motion-reduce:scale-100"
          : "border-brand-border-light/60 bg-white text-brand-ink hover:border-brand-lavender",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-white bg-white"
            : "border-brand-border-light bg-white",
        )}
      >
        {selected ? (
          <span className="h-2.5 w-2.5 rounded-full bg-brand-light" />
        ) : null}
      </span>
      <span className="text-sm sm:text-[0.9375rem]">{label}</span>
    </button>
  );
}
