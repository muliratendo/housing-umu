import type { Diagnostic, OperationEvent } from './events';
import { acceptsIdentity, isRetryEligible, isTerminal } from './guards';
import type { OperationState, RequestIdentity } from './contracts';

const unchanged = <T>(state: OperationState<T>): OperationState<T> => state;

const diagnostic = <T>(
    code: Diagnostic['code'],
    event: OperationEvent<T>,
    state: OperationState<T>,
    onDiagnostic?: (value: Diagnostic) => void,
): void => onDiagnostic?.({ code, event: event as OperationEvent<unknown>, state: state as OperationState<unknown> });

const sameLogicalOperation = (current: RequestIdentity, next: RequestIdentity): boolean =>
    current.operationId === next.operationId &&
    current.correlationId === next.correlationId &&
    current.idempotencyKey === next.idempotencyKey &&
    next.generation > current.generation &&
    next.attemptId !== current.attemptId;

const canReceiveOutcome = (state: OperationState<unknown>): boolean =>
    state.status === 'submitting' ||
    state.status === 'progressing' ||
    state.status === 'accepted' ||
    state.status === 'tracking' ||
    state.status === 'refreshing';

export function reduceOperation<T>(
    state: OperationState<T>,
    event: OperationEvent<T>,
    onDiagnostic?: (diagnostic: Diagnostic) => void,
): OperationState<T> {
    if (event.type === 'START') {
        if (state.status !== 'idle') {
            diagnostic('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
        }
        return { status: 'validating', id: event.identity };
    }

    if (event.type === 'RETRY') {
        if (!('id' in state) || !isRetryEligible(state) || !sameLogicalOperation(state.id, event.identity)) {
            diagnostic('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
        }
        return { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() };
    }

    const active = 'id' in state ? state.id : undefined;
    if (!acceptsIdentity(active, event.identity)) {
        diagnostic('LATE_RESPONSE_IGNORED', event, state, onDiagnostic);
        return unchanged(state);
    }
    if (event.type === 'FINALIZE' || isTerminal(state)) return unchanged(state);

    switch (event.type) {
        case 'CLIENT_INVALID':
            return state.status === 'validating'
                ? { status: 'blocked', id: event.identity, fieldErrors: event.fieldErrors }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'CLIENT_VALID':
            return state.status === 'validating'
                ? { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'PROGRESS':
            return state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'progressing', id: event.identity, progress: event.progress }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SERVER_ACCEPTED':
            return state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'accepted', id: event.identity, jobId: event.jobId }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'TRACK_START':
            return state.status === 'accepted'
                ? { status: 'tracking', id: event.identity, jobId: event.jobId }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'TRACK_PROGRESS':
            return state.status === 'tracking'
                ? { status: 'tracking', id: event.identity, jobId: event.jobId, progress: event.progress }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'REFRESH_START':
            return state.status === 'validating' || state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'refreshing', id: event.identity, data: event.data }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SERVER_VALIDATION':
            return state.status === 'submitting' || state.status === 'progressing'
                ? { status: 'validation_failed', id: event.identity, fieldErrors: event.fieldErrors }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'SUCCESS':
            return canReceiveOutcome(state)
                ? { status: 'succeeded', id: event.identity, data: event.data, effect: event.effect }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
        case 'EMPTY':
            return canReceiveOutcome(state)
                ? { status: 'empty', id: event.identity, reasonCode: event.reasonCode }
                : (diagnostic('INVALID_TRANSITION', event, state, onDiagnostic), unchanged(state));
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
        case 'CANCEL':
            return { status: 'cancelled', id: event.identity, cause: event.cause };
        case 'FAILURE':
            return { status: 'failed', id: event.identity, reasonCode: event.reasonCode, retryable: event.retryable };
        case 'UNKNOWN_FAILURE':
            return { status: 'unknown_failure', id: event.identity, correlationId: event.identity.correlationId };
        default:
            diagnostic('INVALID_TRANSITION', event, state, onDiagnostic);
            return unchanged(state);
    }
}
