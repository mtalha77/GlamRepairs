/**
 * A live length counter that turns red outside its range — HANDOVER-45
 * §3.3. "Counters change behaviour": a number going red as you type
 * prevents the problem, a lint report afterwards does not.
 */
export default function CharCounter({
  length,
  min,
  max,
  label,
}: {
  length: number;
  min?: number;
  max: number;
  /** Optional prefix, e.g. "renders". */
  label?: string;
}) {
  const ok = length <= max && (min === undefined || length >= min);
  return (
    <span
      className={`tabular-nums text-xs font-medium ${ok ? "text-emerald-700" : "text-red-600"}`}
      aria-live="polite"
    >
      {label ? `${label} ` : ""}
      {length} / {min !== undefined ? `${min}–` : ""}
      {max}
    </span>
  );
}
