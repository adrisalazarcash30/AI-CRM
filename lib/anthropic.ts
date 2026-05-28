import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-5";

export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10;
}

export function anthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function tryParseJson<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(body) as T;
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(body.slice(first, last + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export type ParsedActivity = {
  type: "call" | "email" | "meeting" | "note" | "demo" | "task";
  summary: string;
  contact_name: string | null;
  next_step: string | null;
  due_date: string | null;
  sentiment: "positive" | "neutral" | "negative";
};

export type DealSummary = { summary: string; next_action: string };

export async function dealSummary(
  deal: {
    name: string;
    stage: string;
    value_cents: number;
    expected_close: string | null;
    company_name: string | null;
    industry: string | null;
    days_in_stage: number;
  },
  activities: { type: string; body: string | null; occurred_at: string; signal: string | null }[]
): Promise<DealSummary> {
  if (!hasAnthropic()) {
    const positives = activities.filter((a) => a.signal === "positive").length;
    const negatives = activities.filter((a) => a.signal === "negative").length;
    const momentum =
      positives > negatives
        ? "showing positive momentum"
        : negatives > positives
        ? "facing buyer hesitation"
        : "moving at a steady pace";
    const last = activities[0];
    return {
      summary: `${deal.name} at ${
        deal.company_name ?? "this account"
      } is in ${deal.stage} for ${deal.days_in_stage} days and ${momentum}.${
        last?.body ? ` Most recent touch: ${last.body}` : ""
      }`,
      next_action:
        deal.stage === "Proposal"
          ? "Confirm decision criteria with the buying committee"
          : deal.stage === "Negotiation"
          ? "Send revised pricing with close-by date"
          : "Schedule a discovery call this week",
    };
  }
  const system = `You are an AI sales analyst. Given a deal and its activity history, return ONLY JSON:
{
  "summary": "<2-3 crisp sentences describing where this deal stands and momentum>",
  "next_action": "<one concrete next action the rep should take, < 12 words, imperative>"
}
No prose outside JSON. No fences.`;

  const value = (deal.value_cents / 100).toFixed(0);
  const activityLines = activities
    .slice(0, 12)
    .map(
      (a) =>
        `- [${a.occurred_at.slice(0, 10)}] ${a.type}${a.signal ? ` (${a.signal})` : ""}: ${
          a.body ?? ""
        }`
    )
    .join("\n");

  const user = `Deal: ${deal.name}
Company: ${deal.company_name ?? "—"}${deal.industry ? ` (${deal.industry})` : ""}
Stage: ${deal.stage} (${deal.days_in_stage} days)
Value: $${value}
Expected close: ${deal.expected_close ?? "—"}

Recent activity (newest first):
${activityLines || "(none)"}`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 350,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: user }],
  });

  const parsed = tryParseJson<DealSummary>(extractText(res));
  return (
    parsed ?? {
      summary: "Insufficient activity to summarize.",
      next_action: "Reach out to the primary contact.",
    }
  );
}

export type RiskScore = { risk: "low" | "medium" | "high"; reason: string };

export async function riskScore(
  deal: {
    name: string;
    stage: string;
    days_in_stage: number;
    expected_close: string | null;
  },
  lastActivityDaysAgo: number | null,
  activityCount: number
): Promise<RiskScore> {
  if (!hasAnthropic()) {
    if (
      deal.days_in_stage > 21 ||
      (lastActivityDaysAgo !== null && lastActivityDaysAgo > 14) ||
      activityCount === 0
    ) {
      return {
        risk: "high",
        reason: `Stalled ${deal.days_in_stage}d in ${deal.stage} with ${
          lastActivityDaysAgo ?? "no"
        } days since last touch.`,
      };
    }
    if (
      deal.days_in_stage > 10 ||
      (lastActivityDaysAgo !== null && lastActivityDaysAgo > 7)
    ) {
      return {
        risk: "medium",
        reason: `Pace is slowing — ${deal.days_in_stage}d in ${deal.stage}, last touch ${lastActivityDaysAgo}d ago.`,
      };
    }
    return {
      risk: "low",
      reason: `Recent activity ${lastActivityDaysAgo}d ago and healthy stage tenure.`,
    };
  }
  const system = `You score sales-deal risk. Return ONLY JSON:
{ "risk": "low" | "medium" | "high", "reason": "<one short sentence explaining why>" }
No prose, no fences.

Heuristics:
- High: stalled in stage > 21 days OR no activity > 14 days OR close date in past with no Won/Lost.
- Medium: stalled 10-21 days OR no activity 7-14 days OR thin history.
- Low: recent activity within 7 days and reasonable stage tenure.`;

  const user = `Deal: ${deal.name}
Stage: ${deal.stage}
Days in stage: ${deal.days_in_stage}
Days since last activity: ${lastActivityDaysAgo ?? "never logged"}
Total activities: ${activityCount}
Expected close: ${deal.expected_close ?? "—"}
Today: ${new Date().toISOString().slice(0, 10)}`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 200,
    temperature: 0.1,
    system,
    messages: [{ role: "user", content: user }],
  });

  const parsed = tryParseJson<RiskScore>(extractText(res));
  return parsed ?? { risk: "medium", reason: "Insufficient data to assess." };
}

export type EmailDraft = { subject: string; body: string };

export type DashboardBriefing = {
  prose: string;
  chips: { dealId: string; dealName: string; reason: string }[];
};

export type BriefingDeal = {
  id: string;
  name: string;
  company: string | null;
  stage: string;
  value_cents: number;
  days_in_stage: number;
  days_since_activity: number | null;
  risk: string | null;
  owner: string | null;
};

export async function dashboardBriefing(deals: BriefingDeal[]): Promise<DashboardBriefing> {
  const open = deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  );
  const totalOpen = open.reduce((s, d) => s + d.value_cents, 0);
  const highRisk = open
    .filter((d) => d.risk === "high" || (d.days_in_stage ?? 0) > 21)
    .sort((a, b) => b.value_cents - a.value_cents);
  const stalled = open
    .filter((d) => (d.days_since_activity ?? 0) > 10)
    .sort((a, b) => b.value_cents - a.value_cents);

  if (!hasAnthropic()) {
    const top = [...open].sort((a, b) => b.value_cents - a.value_cents)[0];
    const prose = `You have ${open.length} open deals worth $${(
      totalOpen / 100000
    ).toFixed(
      0
    )}k. ${
      highRisk.length
    } are flagged high-risk — including [${highRisk[0]?.name ?? top?.name}](#${
      highRisk[0]?.id ?? top?.id
    }), which has been stalled for weeks. Your biggest opportunity remains [${
      top?.name ?? "your top deal"
    }](#${top?.id}) — push that one before Friday.`;
    const chips = [highRisk[0], stalled[0], top]
      .filter((d): d is BriefingDeal => !!d)
      .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
      .slice(0, 3)
      .map((d) => ({
        dealId: d.id,
        dealName: d.name,
        reason:
          d.days_since_activity != null && d.days_since_activity > 10
            ? `No touch in ${d.days_since_activity} days`
            : d.days_in_stage > 21
            ? `Stalled ${d.days_in_stage}d in ${d.stage}`
            : `High-value at risk`,
      }));
    return { prose, chips };
  }

  const lines = deals
    .slice(0, 80)
    .map(
      (d) =>
        `id=${d.id} | "${d.name}" @ ${d.company ?? "—"} | ${d.stage} | $${(
          d.value_cents / 100
        ).toFixed(0)} | ${d.days_in_stage}d in stage | last touch ${
          d.days_since_activity ?? "never"
        }d ago | risk=${d.risk ?? "?"} | owner=${d.owner ?? "?"}`
    )
    .join("\n");

  const system = `You are a sales leader's chief of staff. Write a 3-sentence Monday briefing for the leader. Be specific, numeric, no fluff. When mentioning specific deals inside the prose, format them as markdown links: [Deal Name](#dealId). Use the dealId values exactly as given.

Also return 3 "attention chips" — the deals the leader should personally lean on this week.

Return ONLY JSON, no fences:
{
  "prose": "<3 sentences, may include [Deal Name](#dealId) refs>",
  "chips": [
    { "dealId": "<id>", "dealName": "<name>", "reason": "<short reason, 6-9 words>" },
    ...
  ]
}`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 600,
    temperature: 0.4,
    system,
    messages: [{ role: "user", content: `Pipeline snapshot:\n${lines}` }],
  });

  const parsed = tryParseJson<DashboardBriefing>(extractText(res));
  if (!parsed) {
    return {
      prose: `${open.length} open deals · $${(totalOpen / 100000).toFixed(
        0
      )}k pipeline.`,
      chips: [],
    };
  }
  return parsed;
}

export type AtRiskItem = {
  deal_id: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

export async function rankAtRisk(deals: BriefingDeal[]): Promise<AtRiskItem[]> {
  const candidates = deals.filter(
    (d) =>
      d.stage !== "closed_won" &&
      d.stage !== "closed_lost" &&
      (d.days_in_stage > 14 ||
        (d.days_since_activity ?? 0) > 10 ||
        d.risk === "high")
  );

  if (candidates.length === 0) return [];

  if (!hasAnthropic()) {
    return candidates
      .sort((a, b) => {
        const score = (d: BriefingDeal) =>
          (d.risk === "high" ? 1 : 0) * 1000 +
          (d.days_since_activity ?? 0) * 10 +
          d.days_in_stage * 5 +
          d.value_cents / 100000;
        return score(b) - score(a);
      })
      .slice(0, 5)
      .map((d) => ({
        deal_id: d.id,
        severity:
          d.risk === "high" || d.days_in_stage > 30 ? "high" : "medium",
        reason:
          (d.days_since_activity ?? 0) > 14
            ? `No activity in ${d.days_since_activity} days`
            : d.days_in_stage > 21
            ? `Stalled ${d.days_in_stage}d in ${d.stage}`
            : `Needs attention — last touched ${d.days_since_activity}d ago`,
      }));
  }

  const lines = candidates
    .map(
      (d) =>
        `id=${d.id} | ${d.name} @ ${d.company ?? "—"} | ${d.stage} | $${(
          d.value_cents / 100
        ).toFixed(0)} | days_in_stage=${d.days_in_stage} | days_since_activity=${
          d.days_since_activity ?? "never"
        } | risk=${d.risk ?? "?"} | owner=${d.owner ?? "?"}`
    )
    .join("\n");

  const system = `Rank the top 5 most at-risk deals from this list. For each, give a one-sentence reason (max 14 words) and a severity rating. Return ONLY JSON, no fences:
[
  { "deal_id": "<id>", "severity": "low|medium|high", "reason": "<reason>" }
]`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 500,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: lines }],
  });

  const parsed = tryParseJson<AtRiskItem[]>(extractText(res));
  return parsed ?? [];
}

export async function composeFollowUpEmail(input: {
  dealName: string;
  companyName: string | null;
  stage: string;
  nextAction: string | null;
  summary: string | null;
  contactName: string | null;
  senderName: string | null;
  activities: { type: string; body: string | null; occurred_at: string; signal: string | null }[];
}): Promise<EmailDraft> {
  const recentLines = input.activities
    .slice(0, 12)
    .map(
      (a) =>
        `- [${a.occurred_at.slice(0, 10)}] ${a.type}${a.signal ? ` (${a.signal})` : ""}: ${
          a.body ?? ""
        }`
    )
    .join("\n");

  if (!hasAnthropic()) {
    const firstName = input.contactName?.split(" ")[0] ?? "there";
    const subject = `${input.dealName} — quick follow-up`;
    const body = `Hi ${firstName},\n\nThanks again for your time on ${input.dealName}. ${
      input.nextAction ? `As discussed: ${input.nextAction}.` : ""
    }\n\n${
      input.summary ? `Where we stand: ${input.summary}\n\n` : ""
    }Happy to jump on a quick call this week to keep things moving. Let me know what works.\n\nBest,\n${
      input.senderName ?? ""
    }`;
    return { subject, body };
  }

  const system = `You are an experienced enterprise sales rep writing a follow-up email. Be concise, specific, warm but professional. Reference actual details from past activity. No fluff, no "I hope this email finds you well." 4-7 sentences max. Sign with the sender's name.

Return ONLY JSON: { "subject": "<short specific subject>", "body": "<the full email body with line breaks as \\n>" }
No prose outside JSON. No fences.`;

  const user = `Deal: ${input.dealName}
Company: ${input.companyName ?? "—"}
Stage: ${input.stage}
Contact: ${input.contactName ?? "—"}
Sender: ${input.senderName ?? "—"}
Next action to advance: ${input.nextAction ?? "—"}
Where the deal stands: ${input.summary ?? "—"}

Recent activity (newest first):
${recentLines || "(none)"}

Write the next follow-up email that the sender should send to the contact.`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 700,
    temperature: 0.5,
    system,
    messages: [{ role: "user", content: user }],
  });

  const parsed = tryParseJson<EmailDraft>(extractText(res));
  if (!parsed) {
    return {
      subject: `${input.dealName} — follow-up`,
      body: "Quick check-in on next steps. Let me know what works this week.",
    };
  }
  return parsed;
}

export type AskDeal = {
  id: string;
  name: string;
  company: string | null;
  stage: string;
  value_cents: number;
  days_in_stage: number;
  days_since_activity: number | null;
  risk: string | null;
  owner: string | null;
};

export async function askPipeline(question: string, deals: AskDeal[]): Promise<string> {
  if (!hasAnthropic()) {
    const q = question.toLowerCase();
    let picks: AskDeal[] = [];
    let lead = "";
    if (/slip|stall|stuck|stalled/.test(q)) {
      picks = deals
        .filter((d) => d.days_in_stage > 14 || (d.days_since_activity ?? 0) > 10)
        .sort((a, b) => b.days_in_stage - a.days_in_stage)
        .slice(0, 5);
      lead = `${picks.length} deals have slipped — none touched recently or stuck in stage:`;
    } else if (/follow.?up|forgot|haven.?t|neglect/.test(q)) {
      picks = deals
        .filter((d) => (d.days_since_activity ?? 99) > 7)
        .sort((a, b) => (b.days_since_activity ?? 0) - (a.days_since_activity ?? 0))
        .slice(0, 5);
      lead = `Top deals overdue for follow-up:`;
    } else if (/focus|today|priority|hot|important/.test(q)) {
      picks = deals
        .filter((d) => d.stage === "negotiation" || d.stage === "proposal")
        .sort((a, b) => b.value_cents - a.value_cents)
        .slice(0, 5);
      lead = `Focus today — biggest late-stage deals:`;
    } else if (/risk|red|danger/.test(q)) {
      picks = deals.filter((d) => d.risk === "high").slice(0, 5);
      lead = `${picks.length} deals flagged high risk:`;
    } else {
      picks = deals.sort((a, b) => b.value_cents - a.value_cents).slice(0, 5);
      lead = `Top deals by value:`;
    }
    const bullets = picks
      .map(
        (d) =>
          `- [${d.name}](#${d.id}) · ${d.company ?? "—"} · ${d.stage} · $${(
            d.value_cents / 100
          ).toFixed(0)} · ${d.days_in_stage}d in stage`
      )
      .join("\n");
    return `${lead}\n${bullets || "_No matching deals._"}`;
  }

  const system = `You are a sales-pipeline analyst. Answer the rep's question concisely in plain English (max 4 sentences). When referencing specific deals, format them as markdown links: [Deal Name](#dealId). Use the dealId values exactly as given. Be specific, cite numbers.`;

  const lines = deals
    .slice(0, 60)
    .map(
      (d) =>
        `- id=${d.id} | "${d.name}" @ ${d.company ?? "—"} | ${d.stage} | $${(
          d.value_cents / 100
        ).toFixed(0)} | ${d.days_in_stage}d in stage | last activity ${
          d.days_since_activity ?? "never"
        }d ago | risk=${d.risk ?? "?"} | owner=${d.owner ?? "?"}`
    )
    .join("\n");

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 500,
    temperature: 0.4,
    system,
    messages: [
      { role: "user", content: `Pipeline snapshot:\n${lines}\n\nQuestion: ${question}` },
    ],
  });
  return extractText(res);
}

export async function mondayBriefing(stats: {
  total_deals: number;
  total_value_cents: number;
  high_risk: number;
  closing_this_week: number;
  stalled: number;
  top_deal_name: string | null;
  top_deal_value_cents: number;
}): Promise<string> {
  if (!hasAnthropic()) {
    const m = `$${(stats.total_value_cents / 100000).toFixed(0)}k`;
    const top = stats.top_deal_name
      ? `${stats.top_deal_name} ($${(stats.top_deal_value_cents / 100).toFixed(0)})`
      : "—";
    return `${stats.total_deals} open deals worth ${m} across the board. ${stats.high_risk} are high-risk and ${stats.stalled} have stalled longer than two weeks. Spotlight: ${top} — push that one this week.`;
  }
  const system = `You write a 3-sentence Monday morning briefing for a sales leader. Crisp, specific, numeric. No fluff.`;
  const user = `Stats:
- Open deals: ${stats.total_deals}
- Total open value: $${(stats.total_value_cents / 100).toFixed(0)}
- High risk: ${stats.high_risk}
- Closing this week: ${stats.closing_this_week}
- Stalled > 14 days: ${stats.stalled}
- Largest deal: ${stats.top_deal_name ?? "—"} ($${(stats.top_deal_value_cents / 100).toFixed(0)})`;
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 250,
    temperature: 0.5,
    system,
    messages: [{ role: "user", content: user }],
  });
  return extractText(res);
}

export async function parseActivity(
  rawText: string,
  dealContext: { dealName: string; companyName: string | null; stage: string }
): Promise<ParsedActivity> {
  if (!hasAnthropic()) {
    const lower = rawText.toLowerCase();
    const type: ParsedActivity["type"] = lower.includes("call")
      ? "call"
      : lower.includes("email") || lower.includes("emailed")
      ? "email"
      : lower.includes("demo")
      ? "demo"
      : lower.includes("meeting") || lower.includes("met")
      ? "meeting"
      : "note";
    const sentiment: ParsedActivity["sentiment"] =
      /(confirm|interested|excited|approved|signed|positive|great)/i.test(rawText)
        ? "positive"
        : /(stall|concern|no|push back|delay|ghost|hesit)/i.test(rawText)
        ? "negative"
        : "neutral";
    const nameMatch = rawText.match(
      /\b(?:with|to|from|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    );
    const contact_name = nameMatch?.[1] ?? null;
    const dayMatch = rawText.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|today)\b/i
    );
    let due_date: string | null = null;
    if (dayMatch) {
      const today = new Date();
      const map: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };
      const lower2 = dayMatch[1].toLowerCase();
      if (lower2 === "today") due_date = today.toISOString().slice(0, 10);
      else if (lower2 === "tomorrow") {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        due_date = d.toISOString().slice(0, 10);
      } else if (lower2 === "next week") {
        const d = new Date(today);
        d.setDate(d.getDate() + 7);
        due_date = d.toISOString().slice(0, 10);
      } else if (lower2 in map) {
        const target = map[lower2];
        const d = new Date(today);
        const diff = (target - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        due_date = d.toISOString().slice(0, 10);
      }
    }
    const nextMatch = rawText.match(
      /(?:want|need|send|follow up|schedule|book|sign|approve)[^.,;]*/i
    );
    return {
      type,
      summary: rawText.length > 140 ? rawText.slice(0, 140) + "…" : rawText,
      contact_name,
      next_step: nextMatch?.[0]?.trim() ?? null,
      due_date,
      sentiment,
    };
  }

  const system = `You are a CRM activity parser. Convert a sales rep's one-line note into structured JSON.

Return ONLY a JSON object — no prose, no fences — matching this schema:
{
  "type": "call" | "email" | "meeting" | "note" | "demo" | "task",
  "summary": "<one short sentence in past tense>",
  "contact_name": "<contact mentioned, or null>",
  "next_step": "<concrete next action, or null>",
  "due_date": "<YYYY-MM-DD if a date/day is implied, else null>",
  "sentiment": "positive" | "neutral" | "negative"
}

Rules:
- Today's date is ${new Date().toISOString().slice(0, 10)}. Resolve relative dates ("Friday", "next week") to absolute YYYY-MM-DD.
- Sentiment reflects deal momentum: "positive" if buyer is moving forward, "negative" if stalling/objecting, else "neutral".
- Pick the single best "type". Default to "note" if unclear.`;

  const user = `Deal: ${dealContext.dealName} (${dealContext.companyName ?? "—"}) — stage: ${dealContext.stage}

Rep wrote: "${rawText}"`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = extractText(res);
  const parsed = tryParseJson<ParsedActivity>(text);
  if (!parsed) {
    return {
      type: "note",
      summary: rawText.slice(0, 200),
      contact_name: null,
      next_step: null,
      due_date: null,
      sentiment: "neutral",
    };
  }
  return parsed;
}
