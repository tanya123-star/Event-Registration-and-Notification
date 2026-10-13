/**
 * L4: registration read operations.
 *
 * FR-REG-030 (counts), FR-REG-031 (participant list), FR-REG-040 (a student's own registrations),
 * FR-REG-001/FR-REG-002/FR-EVT-014 (published event discovery).
 *
 * These are reads, not decisions: each is a single statement over rows the caller named, so no
 * transaction is needed and none is opened. Every rule that depends on WHO is asking — "an event
 * they own" (FR-REG-030/031), "only their own" (FR-REG-040), audience scoping (FR-EVT-013/014) —
 * belongs to the session layer that supplies the ids. These functions report; they do not permit.
 */

import type { Pool } from "pg";

import { isStudentInAudience } from "../domain/audience.js";
import {
  listEventParticipantRows,
  listPublishedEventRows,
  listPublishedEventRowsWithAudience,
  listUserRegistrationRows,
  readEventRegistrationSummary,
} from "../db/registration-persistence.js";
import { readStudentProfile } from "../db/student-profile-persistence.js";
import type {
  EventRegistrationSummary,
  ParticipantRow,
  PublishedEventRow,
  UserRegistrationRow,
} from "../db/registration-store.types.js";

/** FR-REG-030. Null when the event does not exist. */
export async function getEventRegistrationSummary(
  pool: Pool,
  eventId: string,
): Promise<EventRegistrationSummary | null> {
  const client = await pool.connect();
  try {
    const summary = await readEventRegistrationSummary(client, eventId);
    if (summary === null) {
      return null;
    }
    return {
      eventId,
      capacity: summary.capacity,
      registeredCount: summary.registeredCount,
      availableSlots:
        summary.capacity === null ? null : summary.capacity - summary.registeredCount,
      cancelledCount: summary.cancelledCount,
    };
  } finally {
    client.release();
  }
}

/** FR-REG-031. */
export async function listEventParticipants(
  pool: Pool,
  eventId: string,
): Promise<readonly ParticipantRow[]> {
  const client = await pool.connect();
  try {
    return await listEventParticipantRows(client, eventId);
  } finally {
    client.release();
  }
}

/** FR-REG-040. */
export async function listUserRegistrations(
  pool: Pool,
  userId: string,
): Promise<readonly UserRegistrationRow[]> {
  const client = await pool.connect();
  try {
    return await listUserRegistrationRows(client, userId);
  } finally {
    client.release();
  }
}

/** FR-REG-001, FR-REG-002, FR-EVT-014. Published events only; audience filtering is the session
 * layer's job (see the L2 function). */
export async function listPublishedEvents(pool: Pool): Promise<readonly PublishedEventRow[]> {
  const client = await pool.connect();
  try {
    return await listPublishedEventRows(client);
  } finally {
    client.release();
  }
}

/**
 * FR-REG-001, FR-REG-002, FR-EVT-014, FR-EVT-013 — published Events in the Student audience.
 *
 * MVP T3, issue #4. The StudentProfile is read on the same connection before
 * filtering, and the pure audience evaluator judges each Event. A Student with
 * no profile sees every published Event (transitional fallback while
 * provisioning completes — see `registerParticipant`); every provisioned
 * Student is filtered to their audience. The returned rows carry no contact
 * detail, per ADR-0001 minimum-necessary exposure.
 */
export async function listPublishedEventsForStudent(
  pool: Pool,
  userId: string,
): Promise<readonly PublishedEventRow[]> {
  const client = await pool.connect();
  try {
    const profile = await readStudentProfile(client, userId);
    const rows = await listPublishedEventRowsWithAudience(client);
    if (profile === null) {
      return rows.map(
        ({
          eventId,
          title,
          eventDate,
          venue,
          status,
          registrationOpen,
          registrationDeadline,
          capacity,
          registeredCount,
        }) => ({
          eventId,
          title,
          eventDate,
          venue,
          status,
          registrationOpen,
          registrationDeadline,
          capacity,
          registeredCount,
        }),
      );
    }
    const student = {
      programme: profile.programme,
      yearLevel: profile.yearLevel,
      organizationId: profile.organizationId,
      isEligible: profile.isEligible,
    };
    return rows
      .filter((row) =>
        isStudentInAudience(
          student,
          (row.targetAudience ?? null) as Parameters<typeof isStudentInAudience>[1],
        ),
      )
      .map(
        ({
          eventId,
          title,
          eventDate,
          venue,
          status,
          registrationOpen,
          registrationDeadline,
          capacity,
          registeredCount,
        }) => ({
          eventId,
          title,
          eventDate,
          venue,
          status,
          registrationOpen,
          registrationDeadline,
          capacity,
          registeredCount,
        }),
      );
  } finally {
    client.release();
  }
}
