import { createIdentity } from '../core/identity';
import type { OperationState, RequestIdentity } from '../core/contracts';

export const identityFactory = (overrides: Partial<RequestIdentity> = {}): RequestIdentity => ({
    ...createIdentity(),
    ...overrides,
});

export const idleState = <T>(): OperationState<T> => ({ status: 'idle' });
