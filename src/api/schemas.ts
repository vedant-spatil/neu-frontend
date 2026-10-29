import { z } from "zod";

export const AlertSchema = z.object({
  id: z.number(),
  account_id: z.string(),
  amount: z.number(),
  ts: z.string(),
  risk_score: z.number(),
  rules: z.array(z.string()),
});
export type Alert = z.infer<typeof AlertSchema>;

export const CaseSchema = z.object({
  id: z.number(),
  alert_id: z.number(),
  status: z.string(),
  risk_score: z.number(),
  assignee_id: z.number().nullable().optional(),
});
export type Case = z.infer<typeof CaseSchema>;

export const GraphSchema = z.object({
  elements: z.object({
    nodes: z.array(z.object({ data: z.record(z.any()) })),
    edges: z.array(z.object({ data: z.record(z.any()) })),
  }),
});

export const UserSchema = z.object({ id: z.number(), email: z.string(), role: z.string() });
export const TokenSchema = z.object({ access_token: z.string(), token_type: z.string() });

export const TrendsSchema = z.object({
  alerts_by_day: z.array(z.object({ day: z.string(), alerts: z.number() })),
  activity_by_day: z.array(
    z.object({ day: z.string(), cases_opened: z.number(), approved: z.number(), closed: z.number() }),
  ),
});
export type Trends = z.infer<typeof TrendsSchema>;

// Admin and QA (projects, QA evaluations, admin review). Mirrors app/api/routers/projects.py and users.py.
export const RoleSchema = z.enum(["admin", "qa"]);
export type Role = z.infer<typeof RoleSchema>;

export const ProjectSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  members: z.number().optional(),
  accounts: z.number().optional(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  members: z.array(z.object({ user_id: z.number(), email: z.string() })),
  accounts: z.array(z.string()),
});
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const UserOptionSchema = z.object({ id: z.number(), email: z.string(), role: z.string() });
export type UserOption = z.infer<typeof UserOptionSchema>;

export const EvaluationSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  account_id: z.string(),
  source: z.string(),
  status: z.string(),
  tags: z.array(z.string()),
  notes: z.string(),
  case_id: z.number().nullable(),
  qa_user_id: z.number().nullable(),
  reject_reason: z.string().nullable(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const TagsSchema = z.object({ tags: z.array(z.string()), typology_prefix: z.string() });

export const QaAccountSchema = z.object({
  account_id: z.string(),
  evaluation_id: z.number().nullable(),
  status: z.string(),
  source: z.string().nullable(),
});
export type QaAccount = z.infer<typeof QaAccountSchema>;
