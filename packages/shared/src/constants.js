/**
 * Canonical enums shared between the server (Prisma/BullMQ) and the client
 * (dashboard badges, filters). Keeping this in one place prevents drift
 * between backend state machines and frontend display logic.
 */

/** Lifecycle states of a single privacy (deletion) request sent to a broker. */
export const REQUEST_STATUS = Object.freeze({
  PENDING: "PENDING", // created, not yet dispatched
  SENT: "SENT", // dispatched to broker (email/API/form submitted)
  WAITING: "WAITING", // awaiting broker response within SLA window
  VERIFIED: "VERIFIED", // broker acknowledged / identity verification step completed
  COMPLETED: "COMPLETED", // broker confirmed data removal
  REJECTED: "REJECTED", // broker refused or request invalid
  RETRY: "RETRY", // scheduled for automatic retry
  FAILED: "FAILED", // exhausted retries or unrecoverable error
  ESCALATED: "ESCALATED", // manual/admin escalation required
});

export const REQUEST_STATUS_ORDER = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.SENT,
  REQUEST_STATUS.WAITING,
  REQUEST_STATUS.VERIFIED,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.RETRY,
  REQUEST_STATUS.FAILED,
  REQUEST_STATUS.ESCALATED,
];

/** Legal transitions for the request state machine. Enforced server-side. */
export const REQUEST_STATUS_TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.PENDING]: [REQUEST_STATUS.SENT, REQUEST_STATUS.FAILED],
  [REQUEST_STATUS.SENT]: [REQUEST_STATUS.WAITING, REQUEST_STATUS.RETRY, REQUEST_STATUS.FAILED],
  [REQUEST_STATUS.WAITING]: [
    REQUEST_STATUS.VERIFIED,
    REQUEST_STATUS.COMPLETED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.RETRY,
    REQUEST_STATUS.ESCALATED,
  ],
  [REQUEST_STATUS.VERIFIED]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED, REQUEST_STATUS.ESCALATED],
  [REQUEST_STATUS.RETRY]: [REQUEST_STATUS.SENT, REQUEST_STATUS.FAILED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.REJECTED]: [REQUEST_STATUS.ESCALATED],
  [REQUEST_STATUS.FAILED]: [REQUEST_STATUS.ESCALATED, REQUEST_STATUS.RETRY],
  [REQUEST_STATUS.ESCALATED]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED],
});

export function canTransition(from, to) {
  return Boolean(REQUEST_STATUS_TRANSITIONS[from]?.includes(to));
}

/** How a broker accepts opt-out / deletion requests. */
export const BROKER_METHOD = Object.freeze({
  EMAIL: "EMAIL",
  WEB_FORM: "WEB_FORM",
  API: "API",
  CSV_EXPORT: "CSV_EXPORT",
  CUSTOM: "CUSTOM",
});

export const BROKER_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  UNRESPONSIVE: "UNRESPONSIVE",
  DISABLED: "DISABLED",
  UNDER_REVIEW: "UNDER_REVIEW",
});

export const USER_ROLE = Object.freeze({
  USER: "USER",
  ADMIN: "ADMIN",
  SUPPORT: "SUPPORT",
});

export const NOTIFICATION_CHANNEL = Object.freeze({
  EMAIL: "EMAIL",
  IN_APP: "IN_APP",
  WEBHOOK: "WEBHOOK",
});

export const AUDIT_ACTION = Object.freeze({
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  IDENTITY_CREATED: "IDENTITY_CREATED",
  IDENTITY_UPDATED: "IDENTITY_UPDATED",
  REQUEST_CREATED: "REQUEST_CREATED",
  REQUEST_STATUS_CHANGED: "REQUEST_STATUS_CHANGED",
  BROKER_CREATED: "BROKER_CREATED",
  BROKER_UPDATED: "BROKER_UPDATED",
  ADMIN_ACTION: "ADMIN_ACTION",
});

/** BullMQ queue names — centralised so producers and consumers never drift. */
export const QUEUE_NAMES = Object.freeze({
  DISPATCH_REQUEST: "dispatch-request",
  CHECK_RESPONSE: "check-response",
  RETRY_REQUEST: "retry-request",
  SEND_NOTIFICATION: "send-notification",
  CLEANUP: "cleanup",
  RECURRING_SCAN: "recurring-scan",
});
