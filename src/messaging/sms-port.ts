/**
 * SMS send port — the provider boundary (MVP T11, issue #12).
 *
 * Source: MVP-SPEC.md lines 101/106, PROJECT-GUIDELINES.md section 6,
 * INTEGRATION-BOUNDARIES.md boundary rules BR-1–BR-5.
 *
 * The port carries the minimum data a send needs — recipient plus body —
 * and nothing else. Registration context, attendance and student profile
 * fields must never cross this boundary (the IB-1 minimum-data row applies
 * here by analogy). Failures are values, not exceptions: a future real
 * adapter reports transport outcomes; it never throws delivery guarantees
 * the network cannot keep.
 *
 * SMS sending itself is deferred (MVP-SPEC.md decision 10). The only
 * implementation in the MVP is the mock in `./mock-sms-adapter.js`, bound
 * once in `./sms-binding.js` and called by nothing.
 */

/** One SMS send request. Recipient plus body only. */
export interface SmsMessage {
  readonly to: string;
  readonly body: string;
}

/** Transport outcomes a real adapter may report. Named after the documented
 * boundary rules (timeouts, rate limits, recipient shape) — no invented
 * delivery states. */
export type SmsFailureReason = "TRANSPORT_UNAVAILABLE" | "RATE_LIMITED" | "INVALID_RECIPIENT";

export type SmsSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SmsFailureReason; readonly detail: string };

/** The send port. A future real adapter implements this interface and is
 * swapped in at the single binding in `./sms-binding.js`. */
export interface SmsSendPort {
  send(message: SmsMessage): Promise<SmsSendResult>;
}
