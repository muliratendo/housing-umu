import { describe, expect, it } from 'vitest';
import { identityFactory, idleState } from '../testing/factories';
import { reduceOperation } from './reducer';
import type { OperationEvent } from './events';
import type { OperationState } from './contracts';

const start = <T>(identity = identityFactory()): [OperationState<T>, typeof identity] => [
    reduceOperation(idleState<T>(), { type: 'START', identity }),
    identity,
];

describe('URLM reducer', () => {
    it('keeps input state and event immutable', () => {
        const [state, identity] = start();
        const event = { type: 'CLIENT_VALID', identity } as const;
        const stateBefore = structuredClone(state);
        const eventBefore = structuredClone(event);
        reduceOperation(state, event);
        expect(state).toEqual(stateBefore);
        expect(event).toEqual(eventBefore);
    });

    it('rejects arbitrary starts and retries with diagnostics', () => {
        const [state, identity] = start();
        const diagnostics: string[] = [];
        const startedAgain = reduceOperation(state, { type: 'START', identity }, (value) => diagnostics.push(value.code));
        const retry = reduceOperation(state, { type: 'RETRY', identity }, (value) => diagnostics.push(value.code));
        expect(startedAgain).toBe(state);
        expect(retry).toBe(state);
        expect(diagnostics).toEqual(['INVALID_TRANSITION', 'INVALID_TRANSITION']);
    });

    it('rejects stale operation, attempt, and generation events', () => {
        const [state, identity] = start();
        const diagnostics: string[] = [];
        const events = [
            { type: 'SUCCESS', identity: { ...identity, operationId: 'old' }, data: 1 },
            { type: 'SUCCESS', identity: { ...identity, attemptId: 'old' }, data: 2 },
            { type: 'SUCCESS', identity: { ...identity, generation: identity.generation - 1 }, data: 3 },
            { type: 'SUCCESS', identity: { ...identity, correlationId: 'corr_other' }, data: 4 },
        ] as const;
        for (const event of events) reduceOperation(state, event, (value) => diagnostics.push(value.code));
        expect(state.status).toBe('validating');
        expect(diagnostics).toEqual(['LATE_RESPONSE_IGNORED', 'LATE_RESPONSE_IGNORED', 'LATE_RESPONSE_IGNORED', 'LATE_RESPONSE_IGNORED']);
    });

    it('reaches retained states through exact legal paths', () => {
        const identity = identityFactory();
        const active = start<unknown>(identity)[0];
        expect(reduceOperation(active, { type: 'CLIENT_INVALID', identity, fieldErrors: { email: ['invalid'] } }).status).toBe('blocked');
        expect(reduceOperation(active, { type: 'CLIENT_VALID', identity }).status).toBe('submitting');
        const submitting = reduceOperation(active, { type: 'CLIENT_VALID', identity });
        expect(reduceOperation(submitting, { type: 'PROGRESS', identity, progress: { loaded: 1, total: 2 } }).status).toBe('progressing');
        expect(reduceOperation(submitting, { type: 'SERVER_ACCEPTED', identity, jobId: 'job' }).status).toBe('accepted');
        const accepted = reduceOperation(submitting, { type: 'SERVER_ACCEPTED', identity, jobId: 'job' });
        expect(reduceOperation(accepted, { type: 'TRACK_START', identity, jobId: 'job' }).status).toBe('tracking');
        expect(reduceOperation(submitting, { type: 'REFRESH_START', identity, data: [] }).status).toBe('refreshing');
        expect(reduceOperation(submitting, { type: 'SUCCESS', identity, data: [] }).status).toBe('succeeded');
        expect(reduceOperation(submitting, { type: 'EMPTY', identity, reasonCode: 'none' }).status).toBe('empty');
        expect(reduceOperation(active, { type: 'AUTH_LOST', identity }).status).toBe('auth_required');
        expect(reduceOperation(active, { type: 'FORBIDDEN', identity, reasonCode: 'denied' }).status).toBe('forbidden');
        expect(reduceOperation(active, { type: 'CONFLICT', identity, serverVersion: '2' }).status).toBe('conflicted');
        expect(reduceOperation(active, { type: 'RATE_LIMIT', identity, retryAt: 10 }).status).toBe('throttled');
        expect(reduceOperation(active, { type: 'NETWORK_LOST', identity }).status).toBe('offline');
        expect(reduceOperation(active, { type: 'TIMEOUT_UNKNOWN', identity }).status).toBe('reconciling');
        expect(reduceOperation(active, { type: 'TIMEOUT', identity, outcomeKnown: false }).status).toBe('timed_out');
        expect(reduceOperation(active, { type: 'CANCEL', identity, cause: 'user' }).status).toBe('cancelled');
        expect(reduceOperation(active, { type: 'FAILURE', identity, reasonCode: 'failed', retryable: true }).status).toBe('failed');
        expect(reduceOperation(active, { type: 'UNKNOWN_FAILURE', identity }).status).toBe('unknown_failure');
        const blocked = reduceOperation(active, { type: 'CLIENT_INVALID', identity, fieldErrors: {} });
        expect(reduceOperation(blocked, { type: 'REVALIDATE', identity }).status).toBe('validating');
        const reconciling = reduceOperation(active, { type: 'TIMEOUT_UNKNOWN', identity });
        expect(reduceOperation(reconciling, { type: 'RECONCILE_SUCCESS', identity, data: [] }).status).toBe('succeeded');
        expect(reduceOperation(reconciling, { type: 'RECONCILE_FAILURE', identity, reasonCode: 'not-found' }).status).toBe('failed');
        expect(reduceOperation(reconciling, { type: 'RECONCILE_UNKNOWN', identity }).status).toBe('unknown_failure');
    });

    it('preserves terminal outcomes and makes finalization observational only', () => {
        const [active, identity] = start();
        const success = reduceOperation(
            reduceOperation(active, { type: 'CLIENT_VALID', identity }),
            { type: 'SUCCESS', identity, data: 'ok' },
        );
        expect(reduceOperation(success, { type: 'FAILURE', identity, reasonCode: 'late', retryable: false })).toEqual(success);
        expect(reduceOperation(success, { type: 'FINALIZE', identity })).toEqual(success);
    });

    it('requires logical identity preservation for retry', () => {
        const [active, identity] = start();
        const failed = reduceOperation(
            reduceOperation(active, { type: 'CLIENT_VALID', identity }),
            { type: 'FAILURE', identity, reasonCode: 'temporary', retryable: true },
        );
        const retryIdentity = { ...identity, attemptId: 'new-attempt', generation: identity.generation + 1 };
        expect(reduceOperation(failed, { type: 'RETRY', identity: retryIdentity }).status).toBe('submitting');
        expect(reduceOperation(failed, { type: 'RETRY', identity: { ...retryIdentity, operationId: 'other' } })).toEqual(failed);
    });
});
