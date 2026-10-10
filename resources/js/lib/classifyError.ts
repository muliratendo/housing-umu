/**
 * =============================================================================
 * FILE: lib/classifyError.ts
 * PURPOSE: Single source of truth mapping ANY error (HTTP status, network
 * failure, or unexpected exception) to:
 *   - reasonCode:   machine-readable code for logs/analytics
 *   - userMessage:  grandma-rule copy — what happened, why, what to do next
 *   - placement:    modal | toast | inline — decided HERE, once, based on
 *                    how blocking the error genuinely is, never re-guessed
 *                    by the component rendering it
 *   - retryable:    whether useAsyncSection should auto-retry with backoff
 *
 * COVERAGE: every HTTP status code family from
 * https://en.wikipedia.org/wiki/List_of_HTTP_status_codes that a browser
 * fetch() can realistically surface to a client app, plus non-HTTP failure
 * modes (offline, timeout, aborted, parse errors, CORS).
 *
 * PLACEMENT RULE (matches the original UX spec):
 *  - modal:  ONLY when the user literally cannot proceed with their current
 *            task without resolving this first (auth/session/payment/legal).
 *  - toast:  transient, self-resolving, non-blocking (rate limits, timeouts,
 *            temporary server hiccups the auto-retry is already handling).
 *  - inline: the default for anything scoped to ONE section of the page —
 *            keeps failures contained exactly where the app's graceful
 *            degradation should apply.
 * =============================================================================
 */

export type ErrorPlacement = "modal" | "toast" | "inline";

export interface ClassifiedError {
  reasonCode: string;
  userMessage: string;
  placement: ErrorPlacement;
  retryable: boolean;
}

interface RawError {
  status?: number;
  message?: string;
  name?: string;
}

export function classifyError(err: unknown): ClassifiedError {
  const e = err as RawError;
  const status = e?.status;
  const msg = (e?.message ?? "").toLowerCase();
  const name = (e?.name ?? "").toLowerCase();

  // ---------------------------------------------------------------------
  // NON-HTTP FAILURES (network layer, before a status code even exists)
  // ---------------------------------------------------------------------
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || !navigator.onLine) {
    return {
      reasonCode: "NETWORK_OFFLINE",
      userMessage: "You're not connected to the internet right now. Reconnect and this will pick back up automatically.",
      placement: "toast",
      retryable: true,
    };
  }
  if (name === "aborterror" || msg.includes("aborted")) {
    return {
      reasonCode: "REQUEST_CANCELLED",
      userMessage: "That request was cancelled before it finished. Try again if you still need this.",
      placement: "inline",
      retryable: true,
    };
  }
  if (name === "timeouterror" || msg.includes("timeout")) {
    return {
      reasonCode: "REQUEST_TIMED_OUT",
      userMessage: "That took longer than expected to respond. We're trying again now.",
      placement: "toast",
      retryable: true,
    };
  }
  if (msg.includes("cors") || msg.includes("cross-origin")) {
    return {
      reasonCode: "BLOCKED_BY_BROWSER",
      userMessage: "Your browser blocked this request for security reasons. Reload the page — if it keeps happening, contact an admin.",
      placement: "inline",
      retryable: false,
    };
  }
  if (name === "syntaxerror" || msg.includes("json") || msg.includes("unexpected token")) {
    return {
      reasonCode: "MALFORMED_RESPONSE",
      userMessage: "We got a reply we didn't expect from the server. This has been logged for the dev team — try again shortly.",
      placement: "inline",
      retryable: true,
    };
  }

  if (typeof status !== "number") {
    return {
      reasonCode: "UNKNOWN_ERROR",
      userMessage: "This section ran into an unexpected problem. Try again — if it keeps happening, contact an admin.",
      placement: "inline",
      retryable: true,
    };
  }

  // ---------------------------------------------------------------------
  // 1xx INFORMATIONAL — should never reach app code, but handled to avoid
  // an unclassified fallthrough if a proxy misbehaves.
  // ---------------------------------------------------------------------
  if (status >= 100 && status < 200) {
    return {
      reasonCode: "UNEXPECTED_INFORMATIONAL_RESPONSE",
      userMessage: "The server sent an unusual response while processing this. Try again in a moment.",
      placement: "inline",
      retryable: true,
    };
  }

  // ---------------------------------------------------------------------
  // 3xx REDIRECTION — usually resolved by fetch automatically, but a
  // misconfigured redirect (e.g. 300 Multiple Choices, or a redirect loop
  // fetch refuses to follow) can surface here.
  // ---------------------------------------------------------------------
  if (status >= 300 && status < 400) {
    return {
      reasonCode: "UNEXPECTED_REDIRECT",
      userMessage: "This link points somewhere we couldn't follow automatically. Reload the page and try again.",
      placement: "inline",
      retryable: false,
    };
  }

  // ---------------------------------------------------------------------
  // 4xx CLIENT ERRORS — one distinct code per meaningfully different case
  // ---------------------------------------------------------------------
  switch (status) {
    case 400:
      return {
        reasonCode: "BAD_REQUEST",
        userMessage: "That request wasn't formatted the way we expected. Refresh the page and try again.",
        placement: "inline",
        retryable: false,
      };
    case 401:
      // NOT logged in / session expired — distinct from 403.
      return {
        reasonCode: "SESSION_EXPIRED",
        userMessage: "You've been logged out. Please log in again to continue.",
        placement: "modal",
        retryable: false,
      };
    case 402:
      return {
        reasonCode: "PAYMENT_REQUIRED",
        userMessage: "This action requires payment to be completed first. Check your billing details to continue.",
        placement: "modal",
        retryable: false,
      };
    case 403:
      // Authenticated but genuinely not permitted — distinct from 401.
      return {
        reasonCode: "PERMISSION_DENIED",
        userMessage: "You're logged in, but your account doesn't have access to this. Ask an admin to grant you access.",
        placement: "inline",
        retryable: false,
      };
    case 404:
      return {
        reasonCode: 'NOT_FOUND',
        userMessage:
          "We couldn't find what you're looking for. It may have been moved or removed. Reload the page or Contact an Admin.",
        placement: 'inline',
        retryable: false,
      };
    case 405:
      return {
        reasonCode: "ACTION_NOT_ALLOWED",
        userMessage: "That action isn't supported here. Refresh the page — if it keeps happening, contact an admin.",
        placement: "inline",
        retryable: false,
      };
    case 408:
      return {
        reasonCode: "REQUEST_TIMED_OUT",
        userMessage: "The server took too long to respond. We're trying again now.",
        placement: "toast",
        retryable: true,
      };
    case 409:
      return {
        reasonCode: "CONFLICTING_CHANGE",
        userMessage: "Someone (or something) changed this at the same time as you. Refresh to see the latest version before continuing.",
        placement: "modal",
        retryable: false,
      };
    case 410:
      return {
        reasonCode: "PERMANENTLY_REMOVED",
        userMessage: "This has been permanently removed and won't come back. There's nothing to retry here.",
        placement: "inline",
        retryable: false,
      };
    case 411:
      return {
        reasonCode: "MISSING_CONTENT_LENGTH",
        userMessage: "That upload was sent in a way the server couldn't measure. Try attaching the file again.",
        placement: "inline",
        retryable: false,
      };
    case 412:
      return {
        reasonCode: "PRECONDITION_FAILED",
        userMessage: "The version of this information you're editing is out of date. Refresh to get the latest version before saving.",
        placement: "modal",
        retryable: false,
      };
    case 413:
      return {
        reasonCode: "FILE_TOO_LARGE",
        userMessage: "That file is too large to upload. Try a smaller file.",
        placement: "inline",
        retryable: false,
      };
    case 414:
      return {
        reasonCode: "REQUEST_URL_TOO_LONG",
        userMessage: "That search or link was too long to process. Try shortening it.",
        placement: "inline",
        retryable: false,
      };
    case 415:
      return {
        reasonCode: "UNSUPPORTED_FILE_TYPE",
        userMessage: "That file type isn't supported here. Check the accepted formats and try again.",
        placement: "inline",
        retryable: false,
      };
    case 422:
      return {
        reasonCode: "VALIDATION_FAILED",
        userMessage: "A few details need fixing before this can be submitted. Check the highlighted fields.",
        placement: "inline",
        retryable: false,
      };
    case 423:
      return {
        reasonCode: "RESOURCE_LOCKED",
        userMessage: "This is currently locked, probably because someone else is editing it. Try again shortly.",
        placement: "inline",
        retryable: true,
      };
    case 429:
      return {
        reasonCode: "RATE_LIMITED",
        userMessage: "You've made a lot of requests in a short time. Please wait a few seconds and try again.",
        placement: "toast",
        retryable: true,
      };
    case 451:
      return {
        reasonCode: "BLOCKED_FOR_LEGAL_REASONS",
        userMessage: "This content isn't available for legal reasons in your region.",
        placement: "modal",
        retryable: false,
      };
  }

  // Any other 4xx not explicitly listed above
  if (status >= 400 && status < 500) {
    return {
      reasonCode: "REQUEST_REJECTED",
      userMessage: "The server couldn't process that request as sent. Refresh the page and try again.",
      placement: "inline",
      retryable: false,
    };
  }

  // ---------------------------------------------------------------------
  // 5xx SERVER ERRORS — all transient/retryable, never the user's fault
  // ---------------------------------------------------------------------
  switch (status) {
    case 500:
      return {
        reasonCode: "SERVER_ERROR",
        userMessage: "Our server hit a snag while handling this. We're already retrying — no action needed from you.",
        placement: "toast",
        retryable: true,
      };
    case 501:
      return {
        reasonCode: "FEATURE_NOT_IMPLEMENTED",
        userMessage: "This feature isn't available yet on our server. Our team has been notified.",
        placement: "inline",
        retryable: false,
      };
    case 502:
      return {
        reasonCode: "BAD_GATEWAY",
        userMessage: "One of our servers gave an invalid response to another. We're retrying automatically.",
        placement: "toast",
        retryable: true,
      };
    case 503:
      return {
        reasonCode: "SERVICE_UNAVAILABLE",
        userMessage: "This part of the app is temporarily unavailable, likely for maintenance. We're retrying automatically.",
        placement: "toast",
        retryable: true,
      };
    case 504:
      return {
        reasonCode: "GATEWAY_TIMEOUT",
        userMessage: "A server took too long to respond while processing this. We're trying again now.",
        placement: "toast",
        retryable: true,
      };
    case 507:
      return {
        reasonCode: "SERVER_STORAGE_FULL",
        userMessage: "Our server ran out of space to store this. Our team has been notified.",
        placement: "inline",
        retryable: false,
      };
    case 508:
      return {
        reasonCode: "SERVER_LOOP_DETECTED",
        userMessage: "The server got stuck processing this request. Our team has been notified.",
        placement: "inline",
        retryable: false,
      };
  }

  if (status >= 500 && status < 600) {
    return {
      reasonCode: "SERVER_ERROR",
      userMessage: "Our server hit a snag on our end. We're already retrying — no action needed from you.",
      placement: "toast",
      retryable: true,
    };
  }

  return {
    reasonCode: "UNKNOWN_ERROR",
    userMessage: "This section ran into an unexpected problem. Try again — if it keeps happening, tell an admin.",
    placement: "inline",
    retryable: true,
  };
}
