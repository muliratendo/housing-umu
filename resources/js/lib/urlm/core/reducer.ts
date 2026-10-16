import type { Diagnostic, OperationEvent } from './events';
import { acceptsIdentity, isRetryEligible, isTerminal } from './guards';
import type { OperationState, RequestIdentity } from './contracts';

export type ReductionKind = 'accepted' | 'accepted_noop' | 'rejected_invalid' | 'rejected_stale';
export interface ReductionResult<T> {
    readonly kind: ReductionKind;
    readonly state: OperationState<T>;
}

const unchanged = <T>(state: OperationState<T>): OperationState<T> => state;

const emit = <T>(
    code: Diagnostic['code'],
    event: OperationEvent<T>,
    state: OperationState<T>,
    onDiagnostic?: (value: Diagnostic) => void,
): void => {
    const id = 'identity' in event ? event.identity : undefined;
    const safeRef = (value: string, prefix: string): string | undefined =>
        new RegExp(`^${prefix}_[0-9a-z-]{8,128}$`, 'i').test(value) ? value.slice(0, 64) : undefined;
    try {
        onDiagnostic?.({
            code,
            eventType: event.type,
            sourceStatus: state.status,
            ...(id ? {
                ...(safeRef(id.operationId, 'op') ? { operationRef: safeRef(id.operationId, 'op') } : {}),
                ...(safeRef(id.attemptId, 'attempt') ? { attemptRef: safeRef(id.attemptId, 'attempt') } : {}),
                generation: id.generation,
            } : {}),
        });
    } catch {
        // Diagnostic sinks are observational and cannot affect lifecycle authority.
    }
};

const sameLogicalOperation = (current: RequestIdentity, next: RequestIdentity): boolean =>
    current.operationId === next.operationId &&
    current.correlationId === next.correlationId &&
    current.idempotencyKey === next.idempotencyKey &&
    next.generation > current.generation &&
    next.attemptId !== current.attemptId;

const canReceiveOutcome = (state: OperationState<unknown>): boolean =>
    ['submitting', 'progressing', 'accepted', 'tracking', 'refreshing', 'reconciling', 'awaiting_outcome'].includes(state.status);

export function reduceOperation<T>(
    state: OperationState<T>,
    event: OperationEvent<T>,
    onDiagnostic?: (diagnostic: Diagnostic) => void,
): OperationState<T> {
    if (event.type === 'START') {
        if (state.status !== 'idle' && !isTerminal(state)) {
            emit('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
        }

        return { status: 'validating', id: event.identity };
    }

    if (event.type === 'RETRY') {
        if (!('id' in state) || !isRetryEligible(state) || !sameLogicalOperation(state.id, event.identity)) {
            emit('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
        }
        return { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() };
    }

    if (event.type === 'QUEUED') {
        if (state.status === 'idle' || isTerminal(state)) {
            return { status: 'queued', id: event.identity, position: event.position };
        }
        emit('INVALID_TRANSITION', event, state, onDiagnostic);
        return unchanged(state);
    }

    const active = 'id' in state ? state.id : undefined;
    if (!acceptsIdentity(active, event.identity)) {
        emit('LATE_RESPONSE_IGNORED', event, state, onDiagnostic);
        return unchanged(state);
    }
    if (event.type === 'OUTCOME_REQUIRED') {
        return ['validating', 'submitting', 'progressing', 'accepted', 'tracking', 'refreshing', 'reconciling'].includes(state.status)
            ? { status: 'awaiting_outcome', id: event.identity }
            : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
    }
    if (event.type === 'FINALIZE' || isTerminal(state)) return unchanged(state);

    switch (event.type) {
        case 'PROMOTE':
            return state.status === 'queued'
                ? { status: 'validating', id: event.identity }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'REVALIDATE':
            return state.status === 'blocked'
                ? { status: 'validating', id: event.identity }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'CLIENT_INVALID':
            return state.status === 'validating'
                ? { status: 'blocked', id: event.identity, fieldErrors: event.fieldErrors }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'CLIENT_VALID':
            return state.status === 'validating'
                ? { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'PROGRESS':
            return state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'progressing', id: event.identity, progress: event.progress }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SERVER_ACCEPTED':
            return state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'accepted', id: event.identity, jobId: event.jobId }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'TRACK_START':
            return state.status === 'accepted'
                ? { status: 'tracking', id: event.identity, jobId: event.jobId }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'TRACK_PROGRESS':
            return state.status === 'tracking'
                ? { status: 'tracking', id: event.identity, jobId: event.jobId, progress: event.progress }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'REFRESH_START':
            return ['validating', 'submitting', 'progressing'].includes(state.status)
                ? { status: 'refreshing', id: event.identity, data: event.data }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SERVER_VALIDATION':
            return ['submitting', 'progressing'].includes(state.status)
                ? { status: 'validation_failed', id: event.identity, fieldErrors: event.fieldErrors }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SUCCESS':
            return canReceiveOutcome(state)
                ? { status: 'succeeded', id: event.identity, data: event.data, effect: event.effect }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'EMPTY':
            return canReceiveOutcome(state)
                ? { status: 'empty', id: event.identity, reasonCode: event.reasonCode }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'AUTH_LOST':
            return { status: 'auth_required', id: event.identity };
        case 'FORBIDDEN':
            return { status: 'forbidden', id: event.identity, reasonCode: event.reasonCode };
        case 'CONFLICT':
            return { status: 'conflicted', id: event.identity, serverVersion: event.serverVersion };
        case 'RATE_LIMIT':
            return { status: 'throttled', id: event.identity, retryAt: event.retryAt };
        case 'NETWORK_LOST':
            return { status: 'offline', id: event.identity };
        case 'TIMEOUT_UNKNOWN':
            return { status: 'reconciling', id: event.identity, reason: 'outcome_unknown' };
        case 'TIMEOUT':
            return { status: 'timed_out', id: event.identity, outcomeKnown: event.outcomeKnown ?? false };
        case 'RECONCILE_SUCCESS':
            return state.status === 'reconciling'
                ? { status: 'succeeded', id: event.identity, data: event.data, effect: event.effect }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'RECONCILE_FAILURE':
            return state.status === 'reconciling'
                ? { status: 'failed', id: event.identity, reasonCode: event.reasonCode, retryable: false }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'RECONCILE_UNKNOWN':
            return state.status === 'reconciling'
                ? { status: 'unknown_failure', id: event.identity, correlationId: event.identity.correlationId }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'RECONCILE_CANCEL':
            return state.status === 'reconciling'
                ? { status: 'cancelled', id: event.identity, cause: event.cause }
                : (emit('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'CANCEL':
            return { status: 'cancelled', id: event.identity, cause: event.cause };
        case 'FAILURE':
            return { status: 'failed', id: event.identity, reasonCode: event.reasonCode, retryable: event.retryable };
        case 'UNKNOWN_FAILURE':
            return { status: 'unknown_failure', id: event.identity, correlationId: event.identity.correlationId };
        default:
            emit('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
    }
}

export function reduceOperationResult<T>(
    state: OperationState<T>,
    event: OperationEvent<T>,
    onDiagnostic?: (diagnostic: Diagnostic) => void,
): ReductionResult<T> {
    const active = 'id' in state ? state.id : undefined;
    if (event.type !== 'START' && event.type !== 'RETRY' && event.type !== 'QUEUED' &&
        (!active || !acceptsIdentity(active, event.identity))) {
        return { kind: 'rejected_stale', state: reduceOperation(state, event, onDiagnostic) };
    }
    const next = reduceOperation(state, event, onDiagnostic);
    if (next !== state) return { kind: 'accepted', state: next };
    if (event.type === 'FINALIZE' || (isTerminal(state) && active && acceptsIdentity(active, event.identity))) {
        return { kind: 'accepted_noop', state };
    }
    return { kind: 'rejected_invalid', state };
}
