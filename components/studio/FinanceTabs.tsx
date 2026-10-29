import Link from "next/link";

/** Finance, one section: Payouts and Revenue side by side (Talha, 29 October 2026). */
export default function FinanceTabs({ active }: { active: "payouts" | "revenue" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm ${
        on ? "bg-brand-primary text-white" : "text-brand-gray hover:bg-brand-purple-soft hover:text-brand-primary"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Finance" className="mb-5 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-brand-gray">Finance</span>
      {tab("/studio/payouts", "Practitioner payouts", active === "payouts")}
      {tab("/studio/revenue", "Revenue", active === "revenue")}
    </nav>
  );
}
