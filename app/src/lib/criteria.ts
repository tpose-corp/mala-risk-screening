// The screening criteria currently in force = the newest RuleSet row, or the hospital outline's
// defaults when the admin has never changed anything.
import "server-only";
import { db } from "./db";
import { DEFAULT_PARAMS, RULE_VERSION, type RuleParams } from "./rules";

export async function currentCriteria(): Promise<{ version: string; params: RuleParams }> {
  const latest = await db.ruleSet.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latest) return { version: RULE_VERSION, params: DEFAULT_PARAMS };
  return { version: latest.version, params: { ...DEFAULT_PARAMS, ...(latest.params as Partial<RuleParams>) } };
}

// The numbers a stored screening was scored with (its ruleVersion), so an old result is always
// explained with the criteria that produced it, even after the hospital changed them.
export async function criteriaFor(version: string): Promise<RuleParams> {
  const row = await db.ruleSet.findUnique({ where: { version } });
  return row ? { ...DEFAULT_PARAMS, ...(row.params as Partial<RuleParams>) } : DEFAULT_PARAMS;
}
