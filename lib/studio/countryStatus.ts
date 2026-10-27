/** Shared by the studio Countries page and its actions (client-safe). */

export const RESEARCH_STATUSES = ["unverified", "desk_research", "legal_advice", "cleared", "blocked"] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const RESEARCH_STATUS_LABEL: Record<ResearchStatus, string> = {
  unverified: "Unverified",
  desk_research: "Desk research only",
  legal_advice: "Legal advice taken",
  cleared: "Cleared",
  blocked: "Blocked",
};
