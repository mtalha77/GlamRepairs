"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import TextInput from "@/components/ui/TextInput";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { PAYMENT_STATUS_LABELS, PLAN_OPTIONS } from "@/lib/studio/constants";

type TeamOption = {
  userId: string;
  role: "owner" | "staff";
  displayName: string;
};

type CustomerSearchProps = {
  initialQuery?: string;
  initialPlan?: string;
  initialPayment?: string;
  initialAssigned?: string;
  initialFunnel?: string;
  initialShowTest?: boolean;
  members?: TeamOption[];
  showAssignmentFilter?: boolean;
};

const selectClassName = `${formInputClassName} sm:w-44`;

export default function CustomerSearch({
  initialQuery = "",
  initialPlan = "",
  initialPayment = "",
  initialAssigned = "",
  initialFunnel = "",
  initialShowTest = false,
  members = [],
  showAssignmentFilter = false,
}: CustomerSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [plan, setPlan] = useState(initialPlan);
  const [payment, setPayment] = useState(initialPayment);
  const [assigned, setAssigned] = useState(initialAssigned);
  const [funnel, setFunnel] = useState(initialFunnel);
  const [showTest, setShowTest] = useState(initialShowTest);

  function applyFilters(
    nextQuery: string,
    nextPlan: string,
    nextPayment: string,
    nextAssigned: string,
    nextFunnel: string,
    nextShowTest: boolean,
  ) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextPlan) params.set("plan", nextPlan);
    if (nextPayment) params.set("payment", nextPayment);
    if (nextAssigned) params.set("assigned", nextAssigned);
    if (nextFunnel) params.set("funnel", nextFunnel);
    if (nextShowTest) params.set("showTest", "1");
    router.push(
      params.size > 0
        ? `/studio/customers?${params.toString()}`
        : "/studio/customers",
    );
  }

  const team = members.filter((member) => member.role === "staff");

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters(query, plan, payment, assigned, funnel, showTest);
      }}
    >
      <TextInput
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, email, plan, or GR- reference"
        className="max-w-md"
      />
      <select
        name="plan"
        value={plan}
        aria-label="Filter by plan"
        className={selectClassName}
        onChange={(event) => {
          const nextPlan = event.target.value;
          setPlan(nextPlan);
          applyFilters(query, nextPlan, payment, assigned, funnel, showTest);
        }}
      >
        <option value="">All plans</option>
        {PLAN_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <select
        name="payment"
        value={payment}
        aria-label="Filter by payment"
        className={selectClassName}
        onChange={(event) => {
          const nextPayment = event.target.value;
          setPayment(nextPayment);
          applyFilters(query, plan, nextPayment, assigned, funnel, showTest);
        }}
      >
        <option value="">All payments</option>
        <option value="pending">{PAYMENT_STATUS_LABELS.pending}</option>
        <option value="verified">{PAYMENT_STATUS_LABELS.verified}</option>
      </select>
      {showAssignmentFilter ? (
        <select
          name="assigned"
          value={assigned}
          aria-label="Filter by assignment"
          className={selectClassName}
          onChange={(event) => {
            const nextAssigned = event.target.value;
            setAssigned(nextAssigned);
            applyFilters(query, plan, payment, nextAssigned, funnel, showTest);
          }}
        >
          <option value="">All assignments</option>
          <option value="unassigned">Unassigned</option>
          {team.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
      ) : null}
      <select
        name="funnel"
        value={funnel}
        aria-label="Filter by funnel"
        className={selectClassName}
        onChange={(event) => {
          const nextFunnel = event.target.value;
          setFunnel(nextFunnel);
          applyFilters(query, plan, payment, assigned, nextFunnel, showTest);
        }}
      >
        <option value="">All funnels</option>
        <option value="abandoned">Left funnel</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-brand-gray">
        <input
          type="checkbox"
          checked={showTest}
          onChange={(event) => {
            const nextShowTest = event.target.checked;
            setShowTest(nextShowTest);
            applyFilters(query, plan, payment, assigned, funnel, nextShowTest);
          }}
        />
        Show test entries
      </label>
      <button
        type="submit"
        className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-white"
      >
        Filter
      </button>
    </form>
  );
}
