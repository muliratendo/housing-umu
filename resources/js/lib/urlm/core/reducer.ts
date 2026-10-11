import type { Diagnostic, OperationEvent } from './events';
import { acceptsIdentity, isTerminal } from './guards';
import type { OperationState } from './contracts';

const unchanged = <T>(state: OperationState<T>): OperationState<T> => state;

export function reduceOperation<T>(
    state: OperationState<T>,
    event: OperationEvent<T>,
    onDiagnostic?: (diagnostic: Diagnostic) => void,
): OperationState<T> {
    if (event.type === 'START') return { status: 'validating', id: event.identity };
    if (event.type === 'RETRY') return { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() };

    const active = 'id' in state ? state.id : undefined;
    if (!acceptsIdentity(active, event.identity)) {
        onDiagnostic?.({ code: 'LATE_RESPONSE_IGNORED', event, state });
        return unchanged(state);
    }
    if (event.type === 'FINALIZE') return unchanged(state);
    if (isTerminal(state)) return unchanged(state);

    switch (event.type) {
        case 'CLIENT_INVALID': return { status: 'blocked', id: event.identity, fieldErrors: event.fieldErrors };
        case 'CLIENT_VALID': return { status: 'submitting', id: event.identity, startedAt: event.startedAt ?? Date.now() };
        case 'PROGRESS': return { status: 'progressing', id: event.identity, progress: event.progress };
        case 'SERVER_ACCEPTED': return { status: 'accepted', id: event.identity, jobId: event.jobId };
        case 'TRACK_START': return { status: 'tracking', id: event.identity, jobId: event.jobId };
        case 'SERVER_VALIDATION': return { status: 'validation_failed', id: event.identity, fieldErrors: event.fieldErrors };
        case 'SUCCESS': return { status: 'succeeded', id: event.identity, data: event.data, effect: event.effect };
        case 'EMPTY': return { status: 'empty', id: event.identity, reasonCode: event.reasonCode };
        case 'AUTH_LOST': return { status: 'auth_required', id: event.identity };
        case 'FORBIDDEN': return { status: 'forbidden', id: event.identity, reasonCode: event.reasonCode };
        case 'CONFLICT': return { status: 'conflicted', id: event.identity, serverVersion: event.serverVersion };
        case 'RATE_LIMIT': return { status: 'throttled', id: event.identity, retryAt: event.retryAt };
        case 'NETWORK_LOST': return { status: 'offline', id: event.identity };
        case 'TIMEOUT_UNKNOWN': return { status: 'reconciling', id: event.identity, reason: 'outcome_unknown' };
        case 'TIMEOUT': return { status: 'timed_out', id: event.identity, outcomeKnown: event.outcomeKnown ?? false };
        case 'CANCEL': return { status: 'cancelled', id: event.identity, cause: event.cause };
        case 'FAILURE': return { status: 'failed', id: event.identity, reasonCode: event.reasonCode, retryable: event.retryable };
        case 'UNKNOWN_FAILURE': return { status: 'unknown_failure', id: event.identity, correlationId: event.identity.correlationId };
        default:
            onDiagnostic?.({ code: 'INVALID_TRANSITION', event, state });
            return unchanged(state);
    }
}
