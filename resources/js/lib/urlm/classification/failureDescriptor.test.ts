import { describe, expect, it } from 'vitest';
import { describeFailure } from './failureDescriptor';

describe('sanitized failure descriptors', () => {
    it('classifies transport and authoritative HTTP outcomes without raw input', () => {
        expect(describeFailure(new TypeError('private network detail'), 'corr')).toMatchObject({
            kind: 'network',
            reasonCode: 'NETWORK_ERROR',
            retryable: true,
            correlationId: 'corr',
        });
        expect(describeFailure({ status: 401 })).toMatchObject({ kind: 'unauthenticated', retryable: false });
        expect(describeFailure({ status: 403 })).toMatchObject({ kind: 'forbidden', retryable: false });
        expect(describeFailure({ status: 409 })).toMatchObject({ kind: 'conflict', retryable: false });
        expect(describeFailure({ status: 422 })).toMatchObject({ kind: 'validation', retryable: false });
        expect(describeFailure({ status: 429, retryAt: 123 })).toMatchObject({ kind: 'throttled', retryAt: 123 });
        expect(describeFailure({ status: 429 })).not.toHaveProperty('retryAt');
        expect(describeFailure({ status: 503 })).toMatchObject({ kind: 'http', retryable: true });
    });

    it('distinguishes cancellation from authoritative timeout and handles unknown values', () => {
        expect(describeFailure({ cancelled: true })).toMatchObject({ kind: 'cancelled', retryable: false });
        expect(describeFailure({ timeout: true })).toMatchObject({ kind: 'timeout', retryable: true });
        const unknown = describeFailure({ stack: 'secret', responseBody: 'secret', token: 'secret' });
        expect(unknown).toEqual({ kind: 'unknown', reasonCode: 'UNKNOWN_FAILURE', retryable: false });
        expect(unknown).not.toHaveProperty('stack');
        expect(() => describeFailure({ name: 'AbortError' })).not.toThrow();
    });
});
