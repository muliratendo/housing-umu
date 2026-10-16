export type OperationKind =
    | 'navigation'
    | 'read'
    | 'mutation'
    | 'authentication'
    | 'security_recovery'
    | 'upload'
    | 'download'
    | 'long_job'
    | 'live_stream'
    | 'external_effect';

export type OperationScope = 'field' | 'control' | 'section' | 'page' | 'application';
export type Criticality = 'advisory' | 'important' | 'blocking';
export type Concurrency = 'latest_wins' | 'single_flight' | 'parallel' | 'queue';
export type RetryPolicy = 'never' | 'safe_transient' | 'idempotent_only' | 'user_only';
export type UnresolvedOutcomePolicy = 'join' | 'block';

export interface RequestIdentity {
    readonly operationId: string;
    readonly attemptId: string;
    readonly correlationId: string;
    readonly idempotencyKey?: string;
    readonly generation: number;
}

export interface RequestProfile {
    name: string;
    kind: OperationKind;
    scope: OperationScope;
    criticality: Criticality;
    concurrency: Concurrency;
    retry: RetryPolicy;
    timeoutMs: number;
    staleData: 'forbid' | 'allow_marked' | 'allow_silent_refresh';
    retryBudget?: number;
    unresolvedOutcome?: UnresolvedOutcomePolicy;
}

export type FieldErrors = Record<string, string[]>;
export type CancelCause = 'user' | 'superseded' | 'disposed' | 'navigation' | 'transport';
export interface Progress {
    loaded: number;
    total?: number;
}

export type RetryOrigin = 'automatic' | 'user';

export type OperationState<T> =
    | { status: 'idle' }
    | { status: 'validating'; id: RequestIdentity }
    | { status: 'blocked'; id: RequestIdentity; fieldErrors: FieldErrors }
    | { status: 'submitting'; id: RequestIdentity; startedAt: number }
    | { status: 'progressing'; id: RequestIdentity; progress: Progress }
    | { status: 'accepted'; id: RequestIdentity; jobId: string }
    | { status: 'tracking'; id: RequestIdentity; jobId: string; progress?: Progress }
    | { status: 'refreshing'; id: RequestIdentity; data: T }
    | { status: 'queued'; id: RequestIdentity; position: number }
    | { status: 'awaiting_outcome'; id: RequestIdentity }
    | { status: 'reconciling'; id: RequestIdentity; reason: 'outcome_unknown' }
    | { status: 'succeeded'; id: RequestIdentity; data?: T; effect?: string }
    | { status: 'empty'; id: RequestIdentity; reasonCode: string }
    | { status: 'validation_failed'; id: RequestIdentity; fieldErrors: FieldErrors }
    | { status: 'auth_required'; id: RequestIdentity }
    | { status: 'forbidden'; id: RequestIdentity; reasonCode: string }
    | { status: 'conflicted'; id: RequestIdentity; serverVersion?: string }
    | { status: 'throttled'; id: RequestIdentity; retryAt?: number }
    | { status: 'offline'; id: RequestIdentity }
    | { status: 'timed_out'; id: RequestIdentity; outcomeKnown: boolean }
    | { status: 'cancelled'; id: RequestIdentity; cause: CancelCause }
    | { status: 'failed'; id: RequestIdentity; reasonCode: string; retryable: boolean }
    | { status: 'unknown_failure'; id: RequestIdentity; correlationId: string }
    | { status: 'abandoned'; id: RequestIdentity };

export const TERMINAL_STATUSES = [
    'succeeded',
    'empty',
    'validation_failed',
    'auth_required',
    'forbidden',
    'conflicted',
    'throttled',
    'offline',
    'timed_out',
    'cancelled',
    'failed',
    'unknown_failure',
    'abandoned',
] as const;

export type RetryEligibleState<T> =
    | Extract<OperationState<T>, { status: 'offline' | 'timed_out' | 'awaiting_outcome' | 'reconciling' }>
    | Extract<OperationState<T>, { status: 'failed'; retryable: true }>;
