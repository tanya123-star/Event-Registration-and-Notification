/**
 * Mock SMS adapter — the MVP's only SmsSendPort implementation (issue #12).
 *
 * Records sends in memory for future tests. Sends nothing: no provider, no
 * credentials, no network calls. Always reports success — failure simulation
 * belongs to a future test double with its own ticket, not to this mock.
 */

import type { SmsMessage, SmsSendResult, SmsSendPort } from "./sms-port.js";

/** One recorded send: exactly what the port received. */
export type RecordedSms = SmsMessage;

/** In-memory SmsSendPort. One instance is bound in `./sms-binding.js`. */
export class MockSmsAdapter implements SmsSendPort {
  private readonly inbox: RecordedSms[] = [];

  public async send(message: SmsMessage): Promise<SmsSendResult> {
    this.inbox.push({ to: message.to, body: message.body });
    return { ok: true };
  }

  /** The sends recorded so far, in order. A copy: callers cannot mutate the log. */
  public sentMessages(): readonly RecordedSms[] {
    return [...this.inbox];
  }

  public clear(): void {
    this.inbox.length = 0;
  }
}
