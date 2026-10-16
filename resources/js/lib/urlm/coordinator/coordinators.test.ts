import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalCoordinator } from './ModalCoordinator';
import { OperationCoordinator } from './OperationCoordinator';
import { OperationRegistry } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';
import { profiles } from '../core/profiles';

const startedIdentity = (result: ReturnType<OperationCoordinator<unknown>['start']>) => {
    if (!result || result.kind !== 'started') throw new Error('expected started');
    return result.identity;
};

describe('URLM coordination', () => {
    afterEach(() => vi.useRealTimers());
    it('preserves logical identity and changes attempt identity on retry', () => {
        const coordinator = new OperationCoordinator('read', { ...profiles.read, retry: 'safe_transient' });
        const first = startedIdentity(coordinator.start('key'));
        coordinator.dispatch({ type: 'NETWORK_LOST', identity: first });
        const retry = coordinator.retry('user');
        expect(retry.kind).toBe('started');
        if (retry.kind !== 'started') return;
        expect(retry.identity.operationId).toBe(first.operationId);
        expect(retry.identity.correlationId).toBe(first.correlationId);
        expect(retry.identity.idempotencyKey).toBe(first.idempotencyKey);
        expect(retry.identity.attemptId).not.toBe(first.attemptId);
    });

    it('reacquires an owned unresolved claim without disturbing queued followers', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'queue' as const, retry: 'safe_transient' as const };
        const owner = new OperationCoordinator('owned-retry', profile, registry);
        const follower = new OperationCoordinator('owned-retry', profile, registry);
        const first = startedIdentity(owner.start('stable'));
        const queued = follower.start();
        expect(queued?.kind).toBe('queued');
        if (!queued || queued.kind !== 'queued') return;
        const unsubscribe = queued.subscribe(() => undefined);
        owner.finalize(first);
        const retry = owner.retry('user');
        expect(retry.kind).toBe('started');
        if (retry.kind !== 'started') return;
        expect(retry.identity.operationId).toBe(first.operationId);
        expect(retry.identity.correlationId).toBe(first.correlationId);
        expect(retry.identity.idempotencyKey).toBe(first.idempotencyKey);
        expect(retry.identity.attemptId).not.toBe(first.attemptId);
        expect(retry.identity.generation).toBeGreaterThan(first.generation);
        expect(follower.getState().status).toBe('queued');
        owner.dispatch({ type: 'SUCCESS', identity: retry.identity });
        expect(follower.getState().status).toBe('validating');
        unsubscribe();
    });

    it('keeps parallel unresolved claims independently addressable', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'parallel' as const };
        const first = new OperationCoordinator('parallel-claims', profile, registry);
        const second = new OperationCoordinator('parallel-claims', profile, registry);
        const firstId = startedIdentity(first.start());
        const secondId = startedIdentity(second.start());
        first.finalize(firstId);
        second.finalize(secondId);
        expect(first.getState().status).toBe('awaiting_outcome');
        expect(second.getState().status).toBe('awaiting_outcome');
        const firstRetry = first.retry('user');
        expect(firstRetry.kind).toBe('started');
        expect(second.getState().status).toBe('awaiting_outcome');
        const secondRetry = second.retry('user');
        expect(secondRetry.kind).toBe('started');
        if (firstRetry.kind !== 'started' || secondRetry.kind !== 'started') return;
        second.dispatch({ type: 'SUCCESS', identity: secondRetry.identity });
        expect(first.getState().status).toBe('submitting');
        expect(second.getState().status).toBe('succeeded');
    });

    it('releases terminal single-flight slots and coordinates separate coordinators', () => {
        const registry = new OperationRegistry();
        const one = new OperationCoordinator('auth', profiles.authentication, registry);
        const two = new OperationCoordinator('auth', profiles.authentication, registry);
        const first = startedIdentity(one.start());
        const joined = two.start();
        expect(joined?.kind).toBe('joined');
        one.dispatch({ type: 'CLIENT_VALID', identity: first });
        one.dispatch({ type: 'SUCCESS', identity: first });
        expect(two.start()?.kind).toBe('started');
    });

    it('latest-wins aborts the old coordinator without allowing stale cancellation', () => {
        const registry = new OperationRegistry();
        const one = new OperationCoordinator('read', profiles.read, registry);
        const two = new OperationCoordinator('read', profiles.read, registry);
        const first = startedIdentity(one.start());
        const second = startedIdentity(two.start());
        expect(one.getState().status).toBe('cancelled');
        expect(one.getIdentity()?.operationId).toBe(first.operationId);
        one.cancel();
        expect(registry.isCurrent('read', second)).toBe(true);
    });

    it('supports parallel siblings and FIFO queue promotion', () => {
        const registry = new OperationRegistry();
        const first = registry.start('parallel', 'parallel', { operationId: 'a', attemptId: 'a', correlationId: 'a', generation: 0 });
        const second = registry.start('parallel', 'parallel', { operationId: 'b', attemptId: 'b', correlationId: 'b', generation: 0 });
        expect(first.kind).toBe('started');
        expect(second.kind).toBe('started');
        if (first.kind === 'started' && second.kind === 'started') {
            expect(registry.release(first.record.identity).released).toBe(true);
            expect(registry.isCurrent('parallel', second.record.identity)).toBe(true);
        }

        const queue = new OperationRegistry();
        const active = queue.start('queue', 'queue', { operationId: 'one', attemptId: 'one', correlationId: 'one', generation: 0 });
        const queued = queue.start('queue', 'queue', { operationId: 'two', attemptId: 'two', correlationId: 'two', generation: 0 });
        expect(queued.kind).toBe('queued');
        expect(active.kind).toBe('started');
        if (active.kind === 'started') {
            const promotion = queue.release(active.record.identity);
            expect(promotion.promoted?.identity.operationId).toBe('two');
        }
        const cancelledQueue = new OperationRegistry();
        const queueActive = cancelledQueue.start('queue', 'queue', { operationId: 'active', attemptId: 'active', correlationId: 'active', generation: 0 });
        const queueItem = cancelledQueue.start('queue', 'queue', { operationId: 'queued', attemptId: 'queued', correlationId: 'queued', generation: 0 });
        expect(queueActive.kind).toBe('started');
        expect(queueItem.kind).toBe('queued');
        if (queueItem.kind === 'queued' && queueActive.kind === 'started') {
            expect(cancelledQueue.cancel('queue', queueItem.record.identity, 'user')).toBe(true);
            expect(cancelledQueue.release(queueActive.record.identity).promoted).toBeUndefined();
        }
    });

    it('does not retry authentication and only invokes cancellation handlers once', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('auth', profiles.authentication, registry);
        const identity = startedIdentity(coordinator.start());
        const handler = vi.fn();
        coordinator.registerCancellation(handler);
        coordinator.dispatch({ type: 'FAILURE', identity, reasonCode: 'temporary', retryable: true });
        expect(coordinator.retry('user').kind).toBe('policy');
        expect(coordinator.retry('automatic').kind).toBe('policy');
        const cancelled = new OperationCoordinator('other-auth', profiles.authentication, registry);
        cancelled.start();
        cancelled.cancel();
        expect(handler).not.toHaveBeenCalled();
    });

    it('enforces safe-transient, idempotent-only, and user-only retry policy', () => {
        const safe = new OperationCoordinator('safe', { ...profiles.read, retry: 'safe_transient' });
        const safeId = startedIdentity(safe.start());
        safe.dispatch({ type: 'FAILURE', identity: safeId, reasonCode: 'temporary', retryable: false });
        expect(safe.retry('user').kind).toBe('ineligible');

        const idempotent = new OperationCoordinator('idempotent', { ...profiles.read, retry: 'idempotent_only' });
        const idempotentId = startedIdentity(idempotent.start());
        idempotent.dispatch({ type: 'NETWORK_LOST', identity: idempotentId });
        expect(idempotent.retry('user').kind).toBe('policy');
        const keyed = new OperationCoordinator('keyed', { ...profiles.read, retry: 'idempotent_only' });
        const keyedId = startedIdentity(keyed.start('stable-key'));
        keyed.dispatch({ type: 'NETWORK_LOST', identity: keyedId });
        expect(keyed.retry('automatic').kind).toBe('started');

        const userOnly = new OperationCoordinator('user-only', { ...profiles.read, retry: 'user_only' });
        const userId = startedIdentity(userOnly.start());
        userOnly.dispatch({ type: 'NETWORK_LOST', identity: userId });
        expect(userOnly.retry('automatic').kind).toBe('policy');
        expect(userOnly.retry('user').kind).toBe('started');
    });

    it('invokes cancellation handlers at most once', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('cancel', profiles.read, registry);
        const identity = startedIdentity(coordinator.start());
        const handler = vi.fn();
        coordinator.registerCancellation(handler);
        coordinator.cancel();
        coordinator.cancel();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(identity.operationId).toBeDefined();
    });

    it('cleans only the owning timer and rejects stale watchdog execution', () => {
        vi.useFakeTimers();
        const registry = new OperationRegistry();
        const first = new OperationCoordinator('read-a', profiles.read, registry);
        const second = new OperationCoordinator('read-b', profiles.read, registry);
        const firstId = startedIdentity(first.start());
        const secondId = startedIdentity(second.start());
        const firstCallback = vi.fn();
        const secondCallback = vi.fn();
        first.setWatchdog(firstCallback);
        second.setWatchdog(secondCallback);
        first.cancel();
        vi.advanceTimersByTime(profiles.read.timeoutMs);
        expect(firstCallback).not.toHaveBeenCalled();
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(secondId.operationId).toBeDefined();
        vi.useRealTimers();
    });

    it('uses lease identity for singleton modal ownership', () => {
        const modals = new ModalCoordinator();
        const first = modals.acquire('first');
        expect(first.acquired).toBe(true);
        if (!first.acquired) return;
        expect(modals.acquire('second').acquired).toBe(false);
        modals.release('stale-lease');
        expect(modals.currentOwner()).toBe('first');
        first.release();
        expect(modals.currentOwner()).toBeUndefined();
    });

    it('cleans a timer directly', () => {
        vi.useFakeTimers();
        const timers = new TimerRegistry();
        const callback = vi.fn();
        const identity = { operationId: 'op', attemptId: 'attempt', correlationId: 'corr', generation: 0 };
        timers.set(identity, callback, 100, () => true);
        timers.clear(identity);
        vi.advanceTimersByTime(100);
        expect(callback).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('activates queued coordinators and exposes joined owner state', () => {
        const registry = new OperationRegistry();
        const owner = new OperationCoordinator('queued', { ...profiles.read, concurrency: 'queue' }, registry);
        const waiting = new OperationCoordinator('queued', { ...profiles.read, concurrency: 'queue' }, registry);
        const first = startedIdentity(owner.start());
        const queued = waiting.start();
        expect(queued?.kind).toBe('queued');
        if (!queued || queued.kind !== 'queued') return;
        expect(waiting.getState().status).toBe('queued');
        owner.cancel();
        expect(waiting.getState().status).toBe('validating');

        const joinedProfile = { ...profiles.read, concurrency: 'single_flight' as const };
        const joinedOwner = new OperationCoordinator('joined', joinedProfile, registry);
        const joinedFollower = new OperationCoordinator('joined', joinedProfile, registry);
        const joinedIdentity = startedIdentity(joinedOwner.start());
        const joined = joinedFollower.start();
        expect(joined?.kind).toBe('joined');
        if (!joined || joined.kind !== 'joined') return;
        const observed: string[] = [];
        const unsubscribe = joined.subscribe((state) => observed.push(state.status));
        joinedOwner.dispatch({ type: 'CLIENT_VALID', identity: joinedIdentity });
        joinedOwner.dispatch({ type: 'SUCCESS', identity: joinedIdentity });
        unsubscribe();
        expect(observed).toEqual(['validating', 'submitting', 'succeeded']);
        expect(joined.getState()?.status).toBe('succeeded');
        expect(first.operationId).not.toBe(queued.identity.operationId);
    });

    it('finalizes missing outcomes and preserves atomic retry ownership', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('finalize', { ...profiles.read, retry: 'safe_transient' }, registry);
        const identity = startedIdentity(coordinator.start());
        expect(coordinator.finalize(identity)).toEqual({ kind: 'needs_outcome_classification' });
        expect(coordinator.getState().status).toBe('awaiting_outcome');
        expect(registry.getByIdentity(identity)).toBeUndefined();
        expect(coordinator.start()).toEqual({ kind: 'already_owner', identity });
        const observed: string[] = [];
        registry.observe(identity, (state) => observed.push(state.status));
        coordinator.dispatch({ type: 'TIMEOUT_UNKNOWN', identity });
        coordinator.dispatch({ type: 'RECONCILE_FAILURE', identity, reasonCode: 'not-found' });
        expect(observed).toEqual(['awaiting_outcome', 'reconciling', 'failed']);
        expect(coordinator.finalize(identity)).toEqual({ kind: 'outcome_accepted' });

        const retryable = new OperationCoordinator('atomic', { ...profiles.read, retry: 'safe_transient' }, registry);
        const first = startedIdentity(retryable.start());
        retryable.dispatch({ type: 'NETWORK_LOST', identity: first });
        const retry = retryable.retry('user');
        expect(retry.kind).toBe('started');
        if (retry.kind === 'started') {
            expect(retry.identity.attemptId).not.toBe(first.attemptId);
            expect(registry.isCurrent('atomic', retry.identity)).toBe(true);
        }
    });

    it('retains cross-coordinator single-flight authority during classification', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'single_flight' as const };
        const owner = new OperationCoordinator('unknown', profile, registry);
        const follower = new OperationCoordinator('unknown', profile, registry);
        const first = startedIdentity(owner.start());
        expect(owner.finalize(first)).toEqual({ kind: 'needs_outcome_classification' });
        const joined = follower.start();
        expect(joined?.kind).toBe('joined');
        if (!joined || joined.kind !== 'joined') return;
        const states: string[] = [];
        joined.subscribe((state) => states.push(state.status));
        owner.dispatch({ type: 'TIMEOUT_UNKNOWN', identity: first });
        owner.dispatch({ type: 'RECONCILE_SUCCESS', identity: first });
        expect(states).toEqual(['awaiting_outcome', 'reconciling', 'succeeded']);
        expect(startedIdentity(new OperationCoordinator('unknown', profile, registry).start())).toBeDefined();
    });

    it('blocks latest-wins and queues FIFO work behind an unresolved claim', () => {
        const registry = new OperationRegistry();
        const ownerProfile = { ...profiles.read, concurrency: 'single_flight' as const };
        const owner = new OperationCoordinator('claim-policy', ownerProfile, registry);
        const identity = startedIdentity(owner.start());
        owner.finalize(identity);

        const latest = new OperationCoordinator('claim-policy', { ...profiles.read, concurrency: 'latest_wins' }, registry);
        expect(latest.start().kind).toBe('blocked');
        const queued = new OperationCoordinator('claim-policy', { ...profiles.read, concurrency: 'queue' }, registry);
        expect(queued.start().kind).toBe('queued');
        owner.dispatch({ type: 'UNKNOWN_FAILURE', identity });
        expect(queued.getState().status).toBe('validating');
    });

    it('does not promote an existing queue behind an unresolved owner', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'queue' as const };
        const owner = new OperationCoordinator('queue-claim', profile, registry);
        const waiting = new OperationCoordinator('queue-claim', profile, registry);
        const ownerId = startedIdentity(owner.start());
        const queued = waiting.start();
        expect(queued?.kind).toBe('queued');
        if (!queued || queued.kind !== 'queued') return;
        const activated: string[] = [];
        queued.subscribe((state) => activated.push(state.status));
        owner.finalize(ownerId);
        expect(waiting.getState().status).toBe('queued');
        expect(activated).toEqual(['queued']);
        owner.dispatch({ type: 'TIMEOUT_UNKNOWN', identity: ownerId });
        expect(activated).toEqual(['queued']);
        owner.dispatch({ type: 'RECONCILE_SUCCESS', identity: ownerId });
        expect(activated).toEqual(['queued', 'validating']);
        owner.finalize(ownerId);
        expect(activated).toEqual(['queued', 'validating']);
    });

    it('uses one-based queue positions and completes live cancellation transaction', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'queue' as const };
        const owner = new OperationCoordinator('queue-position', profile, registry);
        const first = new OperationCoordinator('queue-position', profile, registry);
        const second = new OperationCoordinator('queue-position', profile, registry);
        const ownerId = startedIdentity(owner.start());
        const firstQueued = first.start();
        const secondQueued = second.start();
        expect(firstQueued?.kind).toBe('queued');
        expect(secondQueued?.kind).toBe('queued');
        if (!firstQueued || firstQueued.kind !== 'queued' ||
            !secondQueued || secondQueued.kind !== 'queued') return;
        expect(firstQueued.position).toBe(1);
        expect(secondQueued.position).toBe(2);
        const received: string[] = [];
        registry.observe(ownerId, (state) => received.push(state.status));
        const handler = vi.fn();
        owner.registerCancellation(handler);
        expect(owner.cancel()).toEqual({ kind: 'cancelled' });
        expect(owner.getState().status).toBe('cancelled');
        expect(received).toEqual(['validating', 'cancelled']);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(first.getState().status).toBe('validating');
        expect(second.getState().status).toBe('queued');
        expect(registry.activeRecordCount()).toBe(2);
    });

    it('rejects retry when a newer foreign claim owns the key', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, retry: 'safe_transient' as const, concurrency: 'single_flight' as const };
        const older = new OperationCoordinator('retry-claim', profile, registry);
        const olderId = startedIdentity(older.start());
        older.dispatch({ type: 'NETWORK_LOST', identity: olderId });
        const newer = new OperationCoordinator('retry-claim', profile, registry);
        const newerId = startedIdentity(newer.start());
        newer.finalize(newerId);
        const retry = older.retry('user');
        expect(retry).toEqual({ kind: 'blocked_by_claim', identity: newerId });
        expect(older.getIdentity()).toEqual(olderId);
        expect(newer.start().kind).toBe('already_owner');
        expect(registry.getState(newerId)?.status).toBe('awaiting_outcome');
    });

    it('returns explicit cancellation results for live, unknown, terminal, and disposed states', () => {
        const live = new OperationCoordinator('cancel-results-live', profiles.read);
        startedIdentity(live.start());
        expect(live.cancel()).toEqual({ kind: 'cancelled' });

        const unknown = new OperationCoordinator('cancel-results-unknown', profiles.read);
        const unknownId = startedIdentity(unknown.start());
        unknown.finalize(unknownId);
        expect(unknown.cancel()).toEqual({ kind: 'not_cancellable', reason: 'outcome_unknown' });

        const terminal = new OperationCoordinator('cancel-results-terminal', profiles.read);
        const terminalId = startedIdentity(terminal.start());
        terminal.dispatch({ type: 'CLIENT_VALID', identity: terminalId });
        terminal.dispatch({ type: 'SUCCESS', identity: terminalId });
        expect(terminal.cancel()).toEqual({ kind: 'already_terminal' });

        const disposed = new OperationCoordinator('cancel-results-disposed', profiles.read);
        disposed.dispose();
        expect(disposed.cancel()).toEqual({ kind: 'disposed' });
    });

    it('closes recordless unresolved lifecycles on disposal', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'single_flight' as const };
        const owner = new OperationCoordinator('dispose-unknown', profile, registry);
        const follower = new OperationCoordinator('dispose-unknown', profile, registry);
        const identity = startedIdentity(owner.start());
        expect(owner.finalize(identity)).toEqual({ kind: 'needs_outcome_classification' });
        const joined = follower.start();
        expect(joined?.kind).toBe('joined');
        if (!joined || joined.kind !== 'joined') return;
        const states: string[] = [];
        joined.subscribe((state) => states.push(state.status));
        owner.dispose();
        owner.dispose();
        expect(states).toEqual(['awaiting_outcome', 'abandoned']);
        expect(startedIdentity(new OperationCoordinator('dispose-unknown', profile, registry).start())).toBeDefined();
        expect(registry.activeRecordCount()).toBe(1);
    });

    it('does not publish a foreign event through another coordinator', () => {
        const registry = new OperationRegistry();
        const one = new OperationCoordinator('one', { ...profiles.read, concurrency: 'parallel' }, registry);
        const two = new OperationCoordinator('two', { ...profiles.read, concurrency: 'parallel' }, registry);
        const first = startedIdentity(one.start());
        const second = startedIdentity(two.start());
        const received: string[] = [];
        registry.observe(second, (state) => received.push(state.status));
        const beforeOne = one.getState();
        const beforeTwo = two.getState();
        one.dispatch({ type: 'SUCCESS', identity: second });
        expect(one.getState()).toBe(beforeOne);
        expect(two.getState()).toBe(beforeTwo);
        expect(received).toEqual(['validating']);
        expect(registry.getState(second)).toBe(beforeTwo);
        expect(first.operationId).not.toBe(second.operationId);
    });

    it('keeps joined observers across retry and reports cancellation once', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'single_flight' as const };
        const owner = new OperationCoordinator('joined-retry', profile, registry);
        const follower = new OperationCoordinator('joined-retry', profile, registry);
        const first = startedIdentity(owner.start('stable'));
        const joined = follower.start();
        expect(joined?.kind).toBe('joined');
        if (!joined || joined.kind !== 'joined') return;
        const states: string[] = [];
        const unsubscribe = joined.subscribe((state) => states.push(state.status));
        owner.dispatch({ type: 'NETWORK_LOST', identity: first });
        const retry = owner.retry('user');
        expect(retry.kind).toBe('started');
        if (retry.kind !== 'started') return;
        owner.dispatch({ type: 'CANCEL', identity: retry.identity, cause: 'user' });
        unsubscribe();
        expect(states).toEqual(['validating', 'offline', 'submitting', 'cancelled']);
    });

    it('prevents one coordinator from owning two parallel lifecycles', () => {
        const coordinator = new OperationCoordinator('one-owner', { ...profiles.read, concurrency: 'parallel' });
        const first = startedIdentity(coordinator.start());
        const second = coordinator.start();
        expect(second).toEqual({ kind: 'already_owner', identity: first });
        coordinator.cancel();
        expect(coordinator.getState().status).toBe('cancelled');
    });

    it('isolates observer and cancellation callback failures', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('callbacks', profiles.read, registry);
        const identity = startedIdentity(coordinator.start());
        const received: string[] = [];
        registry.observe(identity, () => { throw new Error('observer secret'); });
        registry.observe(identity, (state) => received.push(state.status));
        coordinator.registerCancellation(() => { throw new Error('handler secret'); });
        expect(() => coordinator.cancel('transport')).not.toThrow();
        expect(received).toEqual(['validating', 'cancelled']);
        expect(registry.activeRecordCount()).toBe(0);
    });

    it('returns disposed without creating identity or registry state', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('disposed', profiles.read, registry);
        coordinator.dispose();
        expect(coordinator.start()).toEqual({ kind: 'disposed' });
        expect(coordinator.getIdentity()).toBeUndefined();
        expect(registry.activeRecordCount()).toBe(0);
        expect(registry.channelCount()).toBe(0);
    });

    it('delivers terminal snapshots to late observers and bounds retention', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('late', profiles.read, registry);
        const identity = startedIdentity(coordinator.start());
        coordinator.dispatch({ type: 'CLIENT_VALID', identity });
        coordinator.dispatch({ type: 'SUCCESS', identity });
        const states: string[] = [];
        const unsubscribe = registry.observe(identity, (state) => states.push(state.status));
        unsubscribe();
        expect(states).toEqual(['succeeded']);
        for (let index = 0; index < 80; index += 1) {
            const item = new OperationCoordinator(`cycle-${index}`, profiles.read, registry);
            const itemIdentity = startedIdentity(item.start());
            item.dispatch({ type: 'CLIENT_VALID', identity: itemIdentity });
            item.dispatch({ type: 'SUCCESS', identity: itemIdentity });
        }
        expect(registry.activeRecordCount()).toBe(0);
        expect(registry.terminalSnapshotCount()).toBeLessThanOrEqual(64);
        expect(registry.channelCount()).toBeLessThanOrEqual(64);
    });

    it('reaps an evicted subscribed channel when its final listener leaves', () => {
        const registry = new OperationRegistry();
        const first = new OperationCoordinator('evicted-first', profiles.read, registry);
        const firstIdentity = startedIdentity(first.start());
        const unsubscribe = registry.observe(firstIdentity, () => undefined);
        first.dispatch({ type: 'CLIENT_VALID', identity: firstIdentity });
        first.dispatch({ type: 'SUCCESS', identity: firstIdentity });
        for (let index = 0; index < 200; index += 1) {
            const item = new OperationCoordinator(`evicted-${index}`, profiles.read, registry);
            const identity = startedIdentity(item.start());
            item.dispatch({ type: 'CLIENT_VALID', identity });
            item.dispatch({ type: 'SUCCESS', identity });
        }
        expect(registry.getState(firstIdentity)?.status).toBe('succeeded');
        const before = registry.channelCount();
        unsubscribe();
        expect(registry.channelCount()).toBeLessThan(before);
        expect(registry.terminalSnapshotCount()).toBeLessThanOrEqual(64);
        expect(registry.activeRecordCount()).toBe(0);
    });

    it('does not clear a timer with mismatched correlation or idempotency', () => {
        vi.useFakeTimers();
        const timers = new TimerRegistry();
        const identity = { operationId: 'op_a', attemptId: 'attempt_a', correlationId: 'corr_a', idempotencyKey: 'key-a', generation: 1 };
        const callback = vi.fn();
        timers.set(identity, callback, 100, () => true);
        timers.clear({ ...identity, correlationId: 'corr_b' });
        vi.advanceTimersByTime(100);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(timers.has(identity)).toBe(false);
    });

    it('blocks synchronous abort outcomes during cancellation', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('abort-race', profiles.read, registry);
        const identity = startedIdentity(coordinator.start());
        coordinator.registerCancellation(() => {
            coordinator.dispatch({ type: 'SUCCESS', identity, data: 'must-not-win' });
        });
        coordinator.cancel('transport');
        expect(coordinator.getState().status).toBe('cancelled');
        expect(registry.activeRecordCount()).toBe(0);
    });
});
