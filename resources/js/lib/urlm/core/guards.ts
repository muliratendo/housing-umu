import { TERMINAL_STATUSES, type OperationState, type RequestIdentity } from './contracts';

export const isTerminal = <T>(state: OperationState<T>): boolean =>
    (TERMINAL_STATUSES as readonly string[]).includes(state.status);

export const sameIdentity = (a: RequestIdentity, b: RequestIdentity): boolean =>
    a.operationId === b.operationId &&
    a.attemptId === b.attemptId &&
    a.correlationId === b.correlationId &&
    a.generation === b.generation;

export const acceptsIdentity = (active: RequestIdentity | undefined, event: RequestIdentity): boolean =>
    active !== undefined &&
    active.operationId === event.operationId &&
    active.generation === event.generation &&
    active.attemptId === event.attemptId;
