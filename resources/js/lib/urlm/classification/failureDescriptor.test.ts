import { describe, expect, it } from 'vitest';
import { describeFailure } from './failureDescriptor';

describe('sanitized failure descriptors', () => {
    it('classifies transport and authoritative HTTP outcomes without raw input', () => {
        expect(describeFailure({ kind: 'network' }, 'corr')).toMatchObject({ kind: 'network', retryable: true, correlationId: 'corr' });
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
        expect(unknown).toEqual({ kind: 'unknown', reasonCode: 'secret_token', retryable: false });
        expect(unknown).not.toHaveProperty('stack');
        expect(describeFailure(new TypeError('private detail') as never)).toMatchObject({ kind: 'unknown' });
        expect(describeFailure({ kind: 'http', status: 99 })).toMatchObject({ kind: 'unknown' });
        expect(describeFailure({ kind: 'http', status: 503, retryAt: Number.NaN })).toMatchObject({ kind: 'unknown' });
        expect(describeFailure({ kind: 'unknown' })).toMatchObject({ kind: 'unknown' });
    });
});
