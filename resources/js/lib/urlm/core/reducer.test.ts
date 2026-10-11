import { describe, expect, it } from 'vitest';
import { identityFactory, idleState } from '../testing/factories';
import { reduceOperation } from './reducer';

describe('URLM reducer', () => {
    it('handles every supported event without throwing', () => {
        const id = identityFactory();
        let state = reduceOperation(idleState(), { type: 'START', identity: id });
        const events = [
            { type: 'CLIENT_VALID', identity: id },
            { type: 'PROGRESS', identity: id, progress: { loaded: 1, total: 2 } },
            { type: 'SERVER_ACCEPTED', identity: id, jobId: 'job' },
            { type: 'TRACK_START', identity: id, jobId: 'job' },
            { type: 'SUCCESS', identity: id, data: 'ok' },
            { type: 'FINALIZE', identity: id },
        ] as const;
        for (const event of events) state = reduceOperation(state, event);
        expect(state.status).toBe('succeeded');
    });

    it('ignores stale identity and generation events', () => {
        const id = identityFactory();
        const stale = identityFactory({ operationId: id.operationId, generation: id.generation - 1 });
        const state = reduceOperation(
            reduceOperation(idleState(), { type: 'START', identity: id }),
            { type: 'SUCCESS', identity: stale, data: 'stale' },
        );
        expect(state.status).toBe('validating');
    });

    it('does not let finalization create or replace an outcome', () => {
        const id = identityFactory();
        const state = reduceOperation(
            reduceOperation(reduceOperation(idleState(), { type: 'START', identity: id }), { type: 'CLIENT_VALID', identity: id }),
            { type: 'FINALIZE', identity: id },
        );
        expect(state.status).toBe('submitting');
    });

    it('preserves terminal outcomes after later events', () => {
        const id = identityFactory();
        const success = reduceOperation(
            reduceOperation(idleState(), { type: 'START', identity: id }),
            { type: 'SUCCESS', identity: id, data: 'ok' },
        );
        expect(reduceOperation(success, { type: 'FAILURE', identity: id, reasonCode: 'late', retryable: false })).toEqual(success);
    });
});
