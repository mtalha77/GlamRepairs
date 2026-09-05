import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listStudioMembers } from "@/lib/studio/member";

export type TeamWorkRow = {
  userId: string;
  name: string;
  reviews: number;
  reports: number;
  emails: number;
};

export type PaymentSplit = {
  paid: number;
  pending: number;
};

export type CustomerTrendPoint = {
  date: string;
  label: string;
  customers: number;
  reviews: number;
  reports: number;
};

export type MonthOption = {
  value: string;
  label: string;
};

export type StudioOverviewCharts = {
  selectedMonth: string;
  months: MonthOption[];
  customerTrend: CustomerTrendPoint[];
  teamWork: TeamWorkRow[];
  payment: PaymentSplit;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function monthValue(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

export function parseMonthParam(value: string | undefined, now = new Date()) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2020 && month >= 1 && month <= 12) {
      return { year, month, value: monthValue(year, month) };
    }
  }

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return { year, month, value: monthValue(year, month) };
}

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function buildMonthDays(year: number, month: number): CustomerTrendPoint[] {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return {
      date: `${year}-${pad(month)}-${pad(day)}`,
      label: String(day),
      customers: 0,
      reviews: 0,
      reports: 0,
    };
  });
}

function listMonthOptions(earliest: Date, now: Date): MonthOption[] {
  const start = new Date(
    Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const options: MonthOption[] = [];

  for (
    let cursor = new Date(end);
    cursor.getTime() >= start.getTime();
    cursor.setUTCMonth(cursor.getUTCMonth() - 1)
  ) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    options.push({
      value: monthValue(year, month),
      label: monthLabel(year, month),
    });
  }

  return options;
}

export async function getStudioOverviewCharts(
  monthParam?: string,
): Promise<StudioOverviewCharts> {
  const supabase = await createServerSupabaseClient();
  const selected = parseMonthParam(monthParam);

  const [members, leadsResult, reviewsResult, reportsResult, emailsResult] =
    await Promise.all([
      listStudioMembers(),
      // Excludes test leads — see HOTFIX-5 §4. Every count/metric on the
      // dashboard should reflect real customers, not the 32 internal rows
      // seeded before is_test existed.
      supabase.from("leads").select("payment_status, created_at").eq("is_test", false),
      supabase.from("studio_reviews").select("created_by, created_at"),
      supabase.from("studio_reports").select("created_by, created_at"),
      supabase.from("studio_emails").select("sent_by"),
    ]);

  if (leadsResult.error) {
    console.error("[getStudioOverviewCharts] leads", leadsResult.error.message);
  }
  if (reviewsResult.error) {
    console.error(
      "[getStudioOverviewCharts] reviews",
      reviewsResult.error.message,
    );
  }
  if (reportsResult.error) {
    console.error(
      "[getStudioOverviewCharts] reports",
      reportsResult.error.message,
    );
  }
  if (emailsResult.error) {
    console.error(
      "[getStudioOverviewCharts] emails",
      emailsResult.error.message,
    );
  }

  const leads = leadsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const emails = emailsResult.data ?? [];

  const teamWork = members.map((member) => ({
    userId: member.userId,
    name: member.displayName,
    reviews: reviews.filter((row) => row.created_by === member.userId).length,
    reports: reports.filter((row) => row.created_by === member.userId).length,
    emails: emails.filter((row) => row.sent_by === member.userId).length,
  }));

  let paid = 0;
  let pending = 0;
  let earliest = new Date();
  const customerTrend = buildMonthDays(selected.year, selected.month);
  const trendIndex = new Map(
    customerTrend.map((point, index) => [point.date, index]),
  );

  function noteDate(value: string) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()) && date < earliest) earliest = date;
    return date;
  }

  for (const lead of leads) {
    if (lead.payment_status === "verified") paid += 1;
    else pending += 1;
    const created = noteDate(lead.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const index = trendIndex.get(utcDateKey(created));
    if (index != null) customerTrend[index].customers += 1;
  }

  for (const row of reviews) {
    const created = noteDate(row.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const index = trendIndex.get(utcDateKey(created));
    if (index != null) customerTrend[index].reviews += 1;
  }

  for (const row of reports) {
    const created = noteDate(row.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const index = trendIndex.get(utcDateKey(created));
    if (index != null) customerTrend[index].reports += 1;
  }

  const months = listMonthOptions(earliest, new Date());
  if (!months.some((item) => item.value === selected.value)) {
    months.unshift({
      value: selected.value,
      label: monthLabel(selected.year, selected.month),
    });
  }

  return {
    selectedMonth: selected.value,
    months,
    customerTrend,
    teamWork,
    payment: { paid, pending },
  };
}
