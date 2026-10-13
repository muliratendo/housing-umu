import { describe, expect, it } from 'vitest';
import { describeFailure } from './failureDescriptor';

describe('sanitized failure descriptors', () => {
    it('classifies transport and authoritative HTTP outcomes without raw input', () => {
        expect(describeFailure({ kind: 'network' }, 'corr_12345678')).toMatchObject({ kind: 'network', retryable: true, correlationId: 'corr_12345678' });
        expect(describeFailure({ kind: 'http', status: 401 })).toMatchObject({ kind: 'unauthenticated', retryable: false });
        expect(describeFailure({ kind: 'http', status: 403 })).toMatchObject({ kind: 'forbidden', retryable: false });
        expect(describeFailure({ kind: 'http', status: 409 })).toMatchObject({ kind: 'conflict', retryable: false });
        expect(describeFailure({ kind: 'http', status: 422 })).toMatchObject({ kind: 'validation', retryable: false });
        expect(describeFailure({ kind: 'http', status: 429, retryAt: 123 })).toMatchObject({ kind: 'throttled', retryAt: 123 });
        expect(describeFailure({ kind: 'http', status: 429 })).not.toHaveProperty('retryAt');
        expect(describeFailure({ kind: 'http', status: 503 })).toMatchObject({ kind: 'http', retryable: true });
    });

    it('distinguishes cancellation from authoritative timeout and handles unknown values', () => {
        expect(describeFailure({ kind: 'cancelled' })).toMatchObject({ kind: 'cancelled', retryable: false });
        expect(describeFailure({ kind: 'timeout' })).toMatchObject({ kind: 'timeout', retryable: true });
        const unknown = describeFailure({ kind: 'unknown', reasonCode: 'secret token' });
        expect(unknown).toEqual({ kind: 'unknown', reasonCode: 'UNKNOWN_FAILURE', retryable: false });
        expect(unknown).not.toHaveProperty('stack');
        expect(describeFailure(new TypeError('private detail') as never)).toMatchObject({ kind: 'unknown' });
        expect(describeFailure({ kind: 'http', status: 99 })).toMatchObject({ kind: 'unknown' });
        expect(describeFailure({ kind: 'http', status: 503, retryAt: Number.NaN })).toMatchObject({ kind: 'unknown' });
        const secrets = ['password', 'Bearer abc123', 'cookie=value', 'select * from users', 'body', 'student@example.com', 'session-123'];
        const serialized = JSON.stringify(describeFailure({ kind: 'unknown', reasonCode: secrets.join('|') }, 'student@example.com'));
        for (const secret of secrets) expect(serialized).not.toContain(secret);
        expect(() => describeFailure({ get kind() { throw new Error('secret'); } })).not.toThrow();
        expect(describeFailure({ kind: 'unknown' })).toMatchObject({ kind: 'unknown' });
    });
});
