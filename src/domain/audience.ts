/**
 * Audience evaluation — pure.
 *
 * Sources:
 *   DATA-MODEL.md section 2.4 (StudentProfile: programme, year level, org, is_eligible)
 *   NOTIFICATION-WORKFLOW.md section 6 (audience types, conjunctive combination,
 *     evaluation against programme, year_level and org_id at dispatch time)
 *   REGISTRATION-WORKFLOW.md line 100 (step 6: in target audience and is_eligible)
 *
 * A null or empty audience admits every Student (FR-NOT-017 "All students").
 * Present criteria combine conjunctively (FR-NOT-022): every stated criterion must
 * match. Within one criterion a list admits any listed value, which is how the
 * interview's "BSIT and BSCS" audience is represented without a second mechanism.
 *
 * Unknown keys are ignored so that events written before this milestone — whose
 * target_audience was an unspecified JSONB document — keep their open meaning
 * rather than silently closing.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

/** The Student facts audience evaluation needs, read from storage at request time. */
export interface AudienceStudentProfile {
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
  readonly isEligible: boolean;
}

/**
 * The audience definition as stored on `erns.event.target_audience`.
 *
 * Canonical keys are the store's snake_case (`year_level`, `organization_id`);
 * the camelCase aliases are accepted so a JavaScript caller cannot silently
 * produce an audience that reads as open to a human reviewing the row.
 */
export interface AudienceDefinition {
  readonly programme?: string | readonly string[];
  readonly year_level?: number | readonly number[];
  readonly yearLevel?: number | readonly number[];
  readonly organization_id?: string | readonly string[] | null;
  readonly organizationId?: string | readonly string[] | null;
  readonly [additional: string]: unknown;
}

function matchesCriterion<T>(actual: T, expected: T | readonly T[] | undefined | null): boolean {
  if (expected === undefined || expected === null) {
    return true;
  }
  if (Array.isArray(expected)) {
    return (expected as readonly T[]).includes(actual);
  }
  return actual === expected;
}

/**
 * Evaluate one Student against one audience definition.
 *
 * `is_eligible` is evaluated first: an ineligible Student is refused even inside
 * the audience (FR-REG-012), and a Student outside the audience is refused even
 * when eligible (FR-REG-011). The source records one step for the pair.
 */
export function isStudentInAudience(
  profile: AudienceStudentProfile,
  audience: AudienceDefinition | null | undefined,
): boolean {
  if (!profile.isEligible) {
    return false;
  }
  if (audience === null || audience === undefined) {
    return true;
  }
  if (typeof audience !== "object" || Array.isArray(audience)) {
    return true;
  }
  const yearLevel = audience.year_level ?? audience.yearLevel;
  const organizationId = audience.organization_id ?? audience.organizationId;
  if (
    !matchesCriterion(profile.programme, audience.programme) ||
    !matchesCriterion(profile.yearLevel, yearLevel) ||
    !matchesCriterion(profile.organizationId, organizationId)
  ) {
    return false;
  }
  return true;
}
