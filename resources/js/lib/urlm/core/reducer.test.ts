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
        ] as const;
        for (const event of events) reduceOperation(state, event, (value) => diagnostics.push(value.code));
        expect(state.status).toBe('validating');
        expect(diagnostics).toEqual(['LATE_RESPONSE_IGNORED', 'LATE_RESPONSE_IGNORED', 'LATE_RESPONSE_IGNORED']);
    });

    it('reaches every retained state through a legal event', () => {
        const identity = identityFactory();
        const paths: Array<OperationEvent<unknown>> = [
            { type: 'CLIENT_INVALID', identity, fieldErrors: { email: ['invalid'] } },
            { type: 'CLIENT_VALID', identity },
            { type: 'PROGRESS', identity, progress: { loaded: 1, total: 2 } },
            { type: 'SERVER_ACCEPTED', identity, jobId: 'job' },
            { type: 'TRACK_START', identity, jobId: 'job' },
            { type: 'TRACK_PROGRESS', identity, jobId: 'job', progress: { loaded: 2, total: 2 } },
            { type: 'REFRESH_START', identity, data: [] },
            { type: 'SUCCESS', identity, data: [] },
            { type: 'EMPTY', identity, reasonCode: 'none' },
            { type: 'AUTH_LOST', identity },
            { type: 'FORBIDDEN', identity, reasonCode: 'denied' },
            { type: 'CONFLICT', identity, serverVersion: '2' },
            { type: 'RATE_LIMIT', identity, retryAt: 10 },
            { type: 'NETWORK_LOST', identity },
            { type: 'TIMEOUT_UNKNOWN', identity },
            { type: 'TIMEOUT', identity, outcomeKnown: false },
            { type: 'CANCEL', identity, cause: 'user' },
            { type: 'FAILURE', identity, reasonCode: 'failed', retryable: true },
            { type: 'UNKNOWN_FAILURE', identity },
        ];
        for (const event of paths) {
            const [active] = start<unknown>(identity);
            expect(reduceOperation(active, event).status).toBeDefined();
        }
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
