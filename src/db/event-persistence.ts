/**
 * Persistence primitives for event creation.
 *
 * L2. Constructs queries, reads rows, writes rows. Decides nothing: the draft rules live in
 * `src/domain/event-validation.ts` and the decision to write lives in `src/l4/create-event.ts`.
 */

import type { PoolClient } from "pg";

export interface EventRowInput {
  readonly title: string;
  readonly description: string;
  readonly eventType: string;
  readonly eventDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly venue: string;
  readonly organizerOrgId: string | null;
  readonly targetAudience: Record<string, unknown> | null;
  readonly registrationRequired: boolean;
  readonly registrationStart: Date | null;
  readonly registrationDeadline: Date | null;
  readonly capacity: number | null;
  readonly contactPerson: string | null;
  readonly eventMechanics: string | null;
  readonly programFlow: string | null;
  readonly requirements: string | null;
  readonly materialsNeeded: string | null;
  readonly dressCode: string | null;
}

/**
 * Insert one event in DRAFT status.
 *
 * The status is passed explicitly rather than relying on the column default, so the L4 decision
 * "creation lands in DRAFT" (FR-EVT-001) is visible at the call site instead of hidden in the
 * schema. `registration_open` keeps its FALSE default: creation does not open registration.
 * FR-EVT-016 metadata (`updated_by`, `updated_at`) is deliberately untouched — creation is not a
 * modification, and stamping it would record a modification with no prior state.
 */
export async function insertEventRow(
  client: PoolClient,
  input: EventRowInput,
): Promise<{ eventId: string }> {
  const { rows } = await client.query<{ event_id: string }>(
    `INSERT INTO erns.event
       (title, description, event_type, event_date, start_time, end_time, venue,
        organizer_org_id, target_audience, registration_required,
        registration_start, registration_deadline, capacity,
        contact_person, event_mechanics, program_flow, requirements,
        materials_needed, dress_code, status)
     VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7,
             $8::uuid, $9, $10,
             $11, $12, $13,
             $14, $15, $16, $17,
             $18, $19, 'DRAFT')
     RETURNING event_id`,
    [
      input.title,
      input.description,
      input.eventType,
      input.eventDate,
      input.startTime,
      input.endTime,
      input.venue,
      input.organizerOrgId,
      input.targetAudience === null ? null : JSON.stringify(input.targetAudience),
      input.registrationRequired,
      input.registrationStart,
      input.registrationDeadline,
      input.capacity,
      input.contactPerson,
      input.eventMechanics,
      input.programFlow,
      input.requirements,
      input.materialsNeeded,
      input.dressCode,
    ],
  );

  const row = rows[0];
  if (row === undefined) {
    throw new Error("insertEventRow returned no row");
  }
  return { eventId: row.event_id };
}
