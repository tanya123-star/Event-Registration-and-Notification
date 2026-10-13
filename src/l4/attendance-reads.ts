/**
 * L4: attendance reads — live counts and staff lookup.
 *
 * Reads, not decisions: every filtering rule that depends on role or
 * ownership belongs to the session layer, which supplies the ids these
 * functions read (mirroring the read contracts in
 * `registration-store.types.ts`).
 */

import type { Pool, PoolClient } from "pg";

import { lookupParticipants as lookupParticipantRows, readAttendanceCounts } from "../db/attendance-persistence.js";
import type {
  AttendanceCounts,
  ParticipantLookupRow,
} from "../db/attendance-store.types.js";

/**
 * FR-ATT-013, FR-ATT-017. Four distinct numbers for one event. Absent is
 * derived (registered minus present), never stored; walk-ins are counted
 * apart and can never merge into present (ATT-13).
 */
export async function getAttendanceCounts(pool: Pool, eventId: string): Promise<AttendanceCounts> {
  const client: PoolClient = await pool.connect();
  try {
    const counts = await readAttendanceCounts(client, eventId);
    return {
      eventId,
      registeredCount: counts.registered,
      presentCount: counts.present,
      absentCount: counts.registered - counts.present,
      walkInCount: counts.walkIns,
    };
  } finally {
    client.release();
  }
}

/**
 * Staff lookup for one assigned event, by name or Confirmation reference.
 * Name plus reference only (ADR-0001); no student-number lookup (OQ-07 open).
 * The session layer supplies the assigned event id; reads never cross it.
 */
export async function lookupParticipants(
  pool: Pool,
  eventId: string,
  query: string,
): Promise<ParticipantLookupRow[]> {
  const client: PoolClient = await pool.connect();
  try {
    return await lookupParticipantRows(client, eventId, query);
  } finally {
    client.release();
  }
}
