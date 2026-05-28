export type Stage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export const STAGES: Stage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const STAGE_PROBABILITY: Record<Stage, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  closed_won: 1,
  closed_lost: 0,
};

export type Risk = "low" | "medium" | "high" | null;

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  industry: string | null;
  size_estimate: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  title: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  name: string;
  company_id: string;
  owner_id: string;
  value_cents: number;
  stage: Stage;
  stage_changed_at: string;
  expected_close: string | null;
  risk: Risk;
  risk_reason: string | null;
  ai_summary: string | null;
  next_action: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  deal_id: string;
  contact_id: string | null;
  user_id: string | null;
  type: string;
  body: string | null;
  raw_input: string | null;
  signal: string | null;
  occurred_at: string;
}

export interface DealWithRelations extends Deal {
  company: Company | null;
  owner: User | null;
}
