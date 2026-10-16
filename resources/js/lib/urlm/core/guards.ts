import { TERMINAL_STATUSES, type OperationState, type RequestIdentity } from './contracts';
import { sameIdentity } from './identity';

export const isTerminal = <T>(state: OperationState<T>): boolean =>
    (TERMINAL_STATUSES as readonly string[]).includes(state.status);

export const acceptsIdentity = (active: RequestIdentity | undefined, event: RequestIdentity): boolean =>
    active !== undefined && sameIdentity(active, event);

export const isRetryEligible = <T>(state: OperationState<T>): boolean =>
    state.status === 'offline' ||
    state.status === 'timed_out' ||
    state.status === 'awaiting_outcome' ||
    state.status === 'reconciling' ||
    (state.status === 'failed' && state.retryable);
