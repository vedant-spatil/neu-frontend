/** The typology checkboxes in the decision form. Keys match the backend's accepted values. */
export const TYPOLOGIES = [
  "structuring",
  "money_mule",
  "funnel",
  "layering",
  "round_trip",
  "pass_through",
  "scatter_gather",
] as const;

export type SarBody = {
  subject?: { party_token?: string };
  activity?: { start?: string; end?: string; total_amount?: number; category?: string };
  cited_txn_ids?: number[];
  narrative?: string;
};

// Synonyms the report writer may use for a category, after normalising case and separators.
const SYNONYMS: Record<string, string> = {
  gather_scatter: "scatter_gather",
  scatter_gather: "scatter_gather",
  money_mule: "money_mule",
  mule: "money_mule",
  round_trip: "round_trip",
  pass_through: "pass_through",
  passthrough: "pass_through",
};

/** "Gather-Scatter" -> "scatter_gather"; "Structuring" -> "structuring". Empty when the category is unknown. */
export function typologyFromCategory(category: string | undefined): string[] {
  if (!category) return [];
  const key = category.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  const mapped = SYNONYMS[key] ?? (TYPOLOGIES as readonly string[]).find((t) => t === key);
  return mapped ? [mapped] : [];
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}

/** Reason text for an approval, built from the SAR. The investigator can edit it. */
export function reasonFromSar(sar: SarBody): string {
  const category = sar.activity?.category ?? "suspicious";
  const amount = sar.activity?.total_amount;
  const amountText = amount !== undefined ? ` totalling ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "";
  const cited = sar.cited_txn_ids?.length ?? 0;
  const basis = sar.narrative ? firstSentence(sar.narrative) : "Basis: rule and graph evidence in this case.";
  return `${category} activity${amountText}; ${cited} cited transactions. ${basis}`.trim();
}

/**
 * Fields to fill when "Approve SAR" is chosen. Only fields that are still empty are filled, so anything the
 * investigator has typed is kept. The review tick is never set here: it records a human review.
 */
export function approvalPrefill(
  sar: SarBody | undefined,
  current: { typologies: string[]; reason: string },
): { typologies: string[]; reason: string } {
  if (!sar) return current;
  const typologies = current.typologies.length === 0 ? typologyFromCategory(sar.activity?.category) : current.typologies;
  const reason = current.reason.trim() === "" ? reasonFromSar(sar) : current.reason;
  return { typologies, reason };
}
