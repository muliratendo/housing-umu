import type { RequestIdentity } from './contracts';

const id = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
};

export const createIdentity = (generation = 0, idempotencyKey?: string): RequestIdentity => Object.freeze({
    operationId: id('op'),
    attemptId: id('attempt'),
    correlationId: id('corr'),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    generation,
});

export const retryIdentity = (identity: RequestIdentity, generation = identity.generation): RequestIdentity => Object.freeze({
    ...identity,
    attemptId: id('attempt'),
    generation,
});

export const identityKey = (identity: RequestIdentity): string =>
    JSON.stringify([
        identity.operationId,
        identity.attemptId,
        identity.correlationId,
        identity.generation,
        identity.idempotencyKey === undefined ? null : identity.idempotencyKey,
    ]);

export const logicalIdentityKey = (identity: RequestIdentity): string =>
    JSON.stringify([
        identity.operationId,
        identity.correlationId,
        identity.idempotencyKey === undefined ? null : identity.idempotencyKey,
    ]);

export const sameIdentity = (a: RequestIdentity, b: RequestIdentity): boolean =>
    identityKey(a) === identityKey(b);
