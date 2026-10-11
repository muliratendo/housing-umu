import type { RequestIdentity } from './contracts';

const id = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
};

export const createIdentity = (generation = 0, idempotencyKey?: string): RequestIdentity => ({
    operationId: id('op'),
    attemptId: id('attempt'),
    correlationId: id('corr'),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    generation,
});

export const retryIdentity = (identity: RequestIdentity, generation = identity.generation): RequestIdentity => ({
    ...identity,
    attemptId: id('attempt'),
    generation,
});
