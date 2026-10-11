import type { CancelCause, FieldErrors, OperationState, Progress, RequestIdentity } from './contracts';

export type OperationEvent<T> =
    | { type: 'START'; identity: RequestIdentity }
    | { type: 'QUEUED'; identity: RequestIdentity; position: number }
    | { type: 'PROMOTE'; identity: RequestIdentity }
    | { type: 'REVALIDATE'; identity: RequestIdentity }
    | { type: 'CLIENT_INVALID'; identity: RequestIdentity; fieldErrors: FieldErrors }
    | { type: 'CLIENT_VALID'; identity: RequestIdentity; startedAt?: number }
    | { type: 'PROGRESS'; identity: RequestIdentity; progress: Progress }
    | { type: 'TRACK_PROGRESS'; identity: RequestIdentity; jobId: string; progress?: Progress }
    | { type: 'REFRESH_START'; identity: RequestIdentity; data: T }
    | { type: 'SERVER_ACCEPTED'; identity: RequestIdentity; jobId: string }
    | { type: 'TRACK_START'; identity: RequestIdentity; jobId: string }
    | { type: 'SERVER_VALIDATION'; identity: RequestIdentity; fieldErrors: FieldErrors }
    | { type: 'SUCCESS'; identity: RequestIdentity; data?: T; effect?: string }
    | { type: 'EMPTY'; identity: RequestIdentity; reasonCode: string }
    | { type: 'AUTH_LOST'; identity: RequestIdentity }
    | { type: 'FORBIDDEN'; identity: RequestIdentity; reasonCode: string }
    | { type: 'CONFLICT'; identity: RequestIdentity; serverVersion?: string }
    | { type: 'RATE_LIMIT'; identity: RequestIdentity; retryAt?: number }
    | { type: 'NETWORK_LOST'; identity: RequestIdentity }
    | { type: 'TIMEOUT_UNKNOWN'; identity: RequestIdentity }
    | { type: 'TIMEOUT'; identity: RequestIdentity; outcomeKnown?: boolean }
    | { type: 'RECONCILE_SUCCESS'; identity: RequestIdentity; data?: T; effect?: string }
    | { type: 'RECONCILE_FAILURE'; identity: RequestIdentity; reasonCode: string }
    | { type: 'RECONCILE_UNKNOWN'; identity: RequestIdentity }
    | { type: 'RECONCILE_CANCEL'; identity: RequestIdentity; cause: CancelCause }
    | { type: 'CANCEL'; identity: RequestIdentity; cause: CancelCause }
    | { type: 'FAILURE'; identity: RequestIdentity; reasonCode: string; retryable: boolean }
    | { type: 'UNKNOWN_FAILURE'; identity: RequestIdentity }
    | { type: 'RETRY'; identity: RequestIdentity; startedAt?: number }
    | { type: 'FINALIZE'; identity: RequestIdentity };

export type Diagnostic = {
    code: 'LATE_RESPONSE_IGNORED' | 'INVALID_TRANSITION';
    eventType: OperationEvent<unknown>['type'];
    sourceStatus: OperationState<unknown>['status'];
    operationRef?: string;
    attemptRef?: string;
    generation?: number;
};
