import { TERMINAL_STATUSES, type OperationState, type RequestIdentity, type RequestProfile, type RetryOrigin } from './contracts';
import { sameIdentity } from './identity';

export const isTerminal = <T>(state: OperationState<T>): boolean =>
    (TERMINAL_STATUSES as readonly string[]).includes(state.status);

export const acceptsIdentity = (active: RequestIdentity | undefined, event: RequestIdentity): boolean =>
    active !== undefined && sameIdentity(active, event);

export const isRetryEligible = <T>(state: OperationState<T>): boolean =>
    state.status === 'offline' ||
    (state.status === 'timed_out' && state.outcomeKnown) ||
    (state.status === 'failed' && state.retryable);

export const isKnownRetryableFailure = isRetryEligible;

export const isOutcomeUncertain = <T>(state: OperationState<T>): boolean =>
    state.status === 'awaiting_outcome' ||
    state.status === 'reconciling' ||
    (state.status === 'timed_out' && !state.outcomeKnown);

export const canRepeatOriginalRequest = <T>(
    profile: RequestProfile,
    identity: RequestIdentity,
    state: OperationState<T>,
    _origin: RetryOrigin,
): boolean => {
    if (isKnownRetryableFailure(state)) {
        if (profile.repeatSafety === 'safe') return true;
        if (profile.repeatSafety === 'requires_idempotency') return identity.idempotencyKey !== undefined;
        return false;
    }
    if (!isOutcomeUncertain(state)) return false;
    if (profile.repeatSafety === 'safe') return true;
    if (profile.repeatSafety === 'requires_idempotency') return identity.idempotencyKey !== undefined;
    return false;
};

export const requiresReconciliation = <T>(profile: RequestProfile, state: OperationState<T>): boolean =>
    isOutcomeUncertain(state) &&
    (profile.repeatSafety === 'reconcile_only' || profile.repeatSafety === 'never');
