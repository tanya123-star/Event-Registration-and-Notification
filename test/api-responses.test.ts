/**
 * The HTTP error contract — pure mapping tests, no database.
 *
 * Every L4 refusal reason must map to exactly one status, and the mapping must be total: adding a
 * reason to a union without a case here is a compile error, which is the point. If this file fails
 * to compile after a refusal type changes, the contract is incomplete — fix the mapping, not the
 * test.
 */

import { describe, expect, it } from "vitest";

import {
  cancelRefusalStatus,
  capacityRefusalStatus,
  createEventRefusalStatus,
  errorBody,
  registrationOpenRefusalStatus,
  registrationRefusalStatus,
} from "../src/app/api/_lib/responses.js";
import type {
  CancelRegistrationRefusalReason,
  CapacityReductionRefusal,
  RegistrationRefusalReason,
  RegistrationOpenRefusalReason,
  RemovalRejection,
} from "../src/db/registration-store.types.js";
import type { CreateEventRefusalReason } from "../src/db/event-store.types.js";

describe("registration refusal mapping", () => {
  const cases: [RegistrationRefusalReason, number][] = [
    ["AUTHENTICATED", 401],
    ["ACCOUNT_ACTIVE", 403],
    ["EVENT_PUBLISHED", 404],
    ["ELIGIBILITY", 403],
    ["REQUIRED_FIELDS", 400],
    ["MISSING_REASON", 400],
    ["REGISTRATION_OPEN", 409],
    ["DEADLINE", 409],
    ["CAPACITY", 409],
    ["DUPLICATE", 409],
    ["STORAGE_DUPLICATE", 409],
    ["CAPACITY_CHANGED", 409],
  ];
  it.each(cases)("reason %s maps to status %i", (reason, status) => {
    expect(registrationRefusalStatus(reason)).toBe(status);
  });
});

describe("cancellation refusal mapping", () => {
  const cases: [CancelRegistrationRefusalReason, number][] = [
    ["REGISTRATION_NOT_FOUND", 404],
    ["MISSING_REASON", 400],
    ["ALREADY_CANCELLED", 409],
    ["REGISTRATION_CLOSED", 409],
  ];
  it.each(cases)("reason %s maps to status %i", (reason, status) => {
    expect(cancelRefusalStatus(reason)).toBe(status);
  });
});

describe("event-creation refusal mapping", () => {
  const cases: [CreateEventRefusalReason, number][] = [
    ["INVALID_DRAFT", 400],
    ["EVENT_CONSTRAINT", 400],
    ["UNKNOWN_ACTOR", 401],
  ];
  it.each(cases)("reason %s maps to status %i", (reason, status) => {
    expect(createEventRefusalStatus(reason)).toBe(status);
  });
});

describe("capacity refusal mapping", () => {
  it("maps a capacity refusal to 409", () => {
    const refusal: CapacityReductionRefusal = {
      kind: "CAPACITY_REDUCTION_REFUSED",
      eventId: "e",
      requestedCapacity: 1,
      currentRegisteredCount: 2,
      remainingRegisteredCount: 2,
      exceedsBy: 1,
      message: "m",
      requirements: "FR-REG-037",
    };
    expect(capacityRefusalStatus(refusal)).toBe(409);
  });

  it("maps an unknown removal id to 404 and other rejections to 409", () => {
    const notFound: RemovalRejection = {
      kind: "REMOVAL_REJECTED",
      registrationId: "r",
      reason: "REGISTRATION_NOT_FOUND",
      message: "m",
      requirements: "FR-REG-014",
    };
    const wrongEvent: RemovalRejection = { ...notFound, reason: "WRONG_EVENT" };
    expect(capacityRefusalStatus(notFound)).toBe(404);
    expect(capacityRefusalStatus(wrongEvent)).toBe(409);
  });
});

describe("close/reopen refusal mapping", () => {
  const cases: [RegistrationOpenRefusalReason, number][] = [
    ["EVENT_NOT_FOUND", 404],
    ["MISSING_REASON", 400],
    ["EVENT_STARTED", 409],
  ];
  it.each(cases)("reason %s maps to status %i", (reason, status) => {
    expect(registrationOpenRefusalStatus(reason)).toBe(status);
  });
});

describe("error body shape", () => {
  it("carries code, message, requirements, and request id", () => {
    expect(errorBody("CAPACITY", "Event is full", "req-1", "FR-REG-013")).toEqual({
      error: { code: "CAPACITY", message: "Event is full", requirements: "FR-REG-013", requestId: "req-1" },
    });
  });

  it("omits requirements and request id when absent", () => {
    expect(errorBody("INTERNAL_ERROR", "An unexpected error occurred", null)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });
});
