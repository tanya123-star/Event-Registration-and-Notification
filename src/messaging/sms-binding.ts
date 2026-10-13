/**
 * The single SMS binding (MVP T11, issue #12).
 *
 * Swapping the mock for a real adapter touches exactly this export and
 * nothing else: point `smsSendPort` at the real implementation. The mock
 * singleton stays exported so future tests can inspect and clear the
 * recorded sends.
 */

import type { SmsSendPort } from "./sms-port.js";
import { MockSmsAdapter } from "./mock-sms-adapter.js";

export const mockSmsAdapter: MockSmsAdapter = new MockSmsAdapter();

export const smsSendPort: SmsSendPort = mockSmsAdapter;
