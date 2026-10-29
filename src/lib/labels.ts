/** A rule name for display: underscores become spaces, so "R3_fan_in" shows as "R3 fan in". */
export function ruleLabel(rule: string): string {
  return rule.replace(/_/g, " ");
}
