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

    it('preserves two FIFO followers across unresolved claim reacquisition', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'queue' as const, retry: 'safe_transient' as const };
        const owner = new OperationCoordinator('owned-retry-two-followers', profile, registry);
        const firstFollower = new OperationCoordinator('owned-retry-two-followers', profile, registry);
        const secondFollower = new OperationCoordinator('owned-retry-two-followers', profile, registry);
        const first = startedIdentity(owner.start('stable'));
        const firstQueued = firstFollower.start();
        const secondQueued = secondFollower.start();
        expect(firstQueued?.kind).toBe('queued');
        expect(secondQueued?.kind).toBe('queued');
        if (firstQueued?.kind !== 'queued' || secondQueued?.kind !== 'queued') return;

        owner.finalize(first);
        const retry = owner.retry('user');
        expect(retry.kind).toBe('started');
        expect(firstFollower.getState().status).toBe('queued');
        expect(secondFollower.getState().status).toBe('queued');
        if (retry.kind !== 'started') return;

        owner.dispatch({ type: 'SUCCESS', identity: retry.identity });
        expect(firstFollower.getState().status).toBe('validating');
        expect(secondFollower.getState().status).toBe('queued');
        const firstFollowerIdentity = firstFollower.getIdentity()!;
        firstFollower.dispatch({ type: 'CLIENT_VALID', identity: firstFollowerIdentity });
        firstFollower.dispatch({ type: 'SUCCESS', identity: firstFollowerIdentity });
        expect(secondFollower.getState().status).toBe('validating');
    });

    it('keeps owner authority and two FIFO followers unchanged for failed replacements', () => {
        const createUnresolvedQueue = () => {
            const registry = new OperationRegistry();
            const profile = { ...profiles.read, concurrency: 'queue' as const, retry: 'safe_transient' as const };
            const owner = new OperationCoordinator('failed-replacement', profile, registry);
            const firstFollower = new OperationCoordinator('failed-replacement', profile, registry);
            const secondFollower = new OperationCoordinator('failed-replacement', profile, registry);
            const ownerIdentity = startedIdentity(owner.start());
            const firstQueued = firstFollower.start();
            const secondQueued = secondFollower.start();
            if (firstQueued?.kind !== 'queued' || secondQueued?.kind !== 'queued') {
                throw new Error('expected queued followers');
            }
            owner.dispatch({ type: 'CLIENT_VALID', identity: ownerIdentity });
            expect(owner.finalize(ownerIdentity)).toEqual({ kind: 'needs_outcome_classification' });
            const ownerStates: string[] = [];
            const firstStates: string[] = [];
            const secondStates: string[] = [];
            const unsubscribeOwner = registry.observe(ownerIdentity, (state) => ownerStates.push(state.status));
            const unsubscribeFirst = firstQueued.subscribe((state) => firstStates.push(state.status));
            const unsubscribeSecond = secondQueued.subscribe((state) => secondStates.push(state.status));
            return {
                registry,
                owner,
                firstFollower,
                secondFollower,
                ownerIdentity,
                firstQueued,
                secondQueued,
                ownerStates,
                firstStates,
                secondStates,
                unsubscribe: () => {
                    unsubscribeOwner();
                    unsubscribeFirst();
                    unsubscribeSecond();
                },
            };
        };

        const assertUnchanged = (
            fixture: ReturnType<typeof createUnresolvedQueue>,
            result: ReturnType<OperationRegistry['reacquireClaim']>,
        ) => {
            expect(result.kind).not.toBe('replaced');
            expect(fixture.owner.getIdentity()).toEqual(fixture.ownerIdentity);
            expect(fixture.owner.getState().status).toBe('awaiting_outcome');
            expect(fixture.registry.claimCount()).toBe(1);
            expect(fixture.registry.activeRecordCount()).toBe(2);
            expect(fixture.firstFollower.getState().status).toBe('queued');
            expect(fixture.secondFollower.getState().status).toBe('queued');
            expect(fixture.firstQueued.position).toBe(1);
            expect(fixture.secondQueued.position).toBe(2);
            expect(fixture.ownerStates).toEqual(['awaiting_outcome']);
            expect(fixture.firstStates).toEqual(['queued']);
            expect(fixture.secondStates).toEqual(['queued']);
        };

        {
            const fixture = createUnresolvedQueue();
            const staleOwner = { ...fixture.ownerIdentity, attemptId: 'attempt_stale' };
            const next = { ...fixture.ownerIdentity, attemptId: 'attempt_next', generation: fixture.ownerIdentity.generation + 1 };
            assertUnchanged(fixture, fixture.registry.reacquireClaim(
                'failed-replacement',
                staleOwner,
                next,
                'queue',
                'safe',
            ));
            fixture.unsubscribe();
        }

        {
            const fixture = createUnresolvedQueue();
            const next = { ...fixture.ownerIdentity, attemptId: 'attempt_next', generation: fixture.ownerIdentity.generation };
            assertUnchanged(fixture, fixture.registry.reacquireClaim(
                'failed-replacement',
                fixture.ownerIdentity,
                next,
                'queue',
                'safe',
            ));
            fixture.unsubscribe();
        }

        {
            const fixture = createUnresolvedQueue();
            const next = { ...fixture.ownerIdentity, attemptId: 'attempt_next', generation: fixture.ownerIdentity.generation + 1 };
            assertUnchanged(fixture, fixture.registry.reacquireClaim(
                'failed-replacement',
                fixture.ownerIdentity,
                next,
                'single_flight',
                'safe',
            ));
            fixture.unsubscribe();
        }

        const fixture = createUnresolvedQueue();
        const replacement = fixture.owner.retry('user');
        expect(replacement.kind).toBe('started');
        if (replacement.kind !== 'started') return;
        fixture.owner.dispatch({ type: 'SUCCESS', identity: replacement.identity });
        expect(fixture.firstFollower.getState().status).toBe('validating');
        expect(fixture.secondFollower.getState().status).toBe('queued');
        const firstIdentity = fixture.firstFollower.getIdentity()!;
        fixture.firstFollower.dispatch({ type: 'CLIENT_VALID', identity: firstIdentity });
        fixture.firstFollower.dispatch({ type: 'SUCCESS', identity: firstIdentity });
        expect(fixture.secondFollower.getState().status).toBe('validating');
        fixture.unsubscribe();
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

    it('isolates parallel observers and reverse completion cleanup', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'parallel' as const };
        const first = new OperationCoordinator('parallel-observed', profile, registry);
        const second = new OperationCoordinator('parallel-observed', profile, registry);
        const firstStates: string[] = [];
        const secondStates: string[] = [];
        const firstId = startedIdentity(first.start());
        const secondId = startedIdentity(second.start());
        registry.observe(firstId, (state) => firstStates.push(state.status));
        registry.observe(secondId, (state) => secondStates.push(state.status));
        first.dispatch({ type: 'CLIENT_VALID', identity: firstId });
        second.dispatch({ type: 'CLIENT_VALID', identity: secondId });
        first.finalize(firstId);
        second.finalize(secondId);
        expect(registry.claimCount()).toBe(2);
        const firstRetry = first.retry('user');
        const secondRetry = second.retry('user');
        expect(firstRetry.kind).toBe('started');
        expect(secondRetry.kind).toBe('started');
        if (firstRetry.kind !== 'started' || secondRetry.kind !== 'started') return;
        second.dispatch({ type: 'SUCCESS', identity: secondRetry.identity });
        expect(firstStates).toEqual(['validating', 'submitting', 'awaiting_outcome', 'submitting']);
        expect(secondStates).toEqual(['validating', 'submitting', 'awaiting_outcome', 'submitting', 'succeeded']);
        expect(registry.claimCount()).toBe(0);
        expect(registry.getState(firstRetry.identity)?.status).toBe('submitting');
        first.dispatch({ type: 'SUCCESS', identity: firstRetry.identity });
        expect(registry.claimCount()).toBe(0);
        expect(registry.activeRecordCount()).toBe(0);
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

    it('applies repeat safety to uncertain outcomes for reads and mutations', () => {
        const read = new OperationCoordinator('uncertain-read', { ...profiles.read, retry: 'safe_transient' });
        const readId = startedIdentity(read.start());
        read.dispatch({ type: 'CLIENT_VALID', identity: readId });
        read.finalize(readId);
        expect(read.retry('automatic').kind).toBe('started');

        const mutation = {
            ...profiles.read,
            kind: 'mutation' as const,
            concurrency: 'single_flight' as const,
            repeatSafety: 'requires_idempotency' as const,
            retry: 'idempotent_only' as const,
        };
        const unkeyed = new OperationCoordinator('uncertain-mutation', mutation);
        const unkeyedId = startedIdentity(unkeyed.start());
        unkeyed.dispatch({ type: 'CLIENT_VALID', identity: unkeyedId });
        unkeyed.finalize(unkeyedId);
        expect(unkeyed.retry('user')).toEqual({ kind: 'reconciliation_required' });

        const keyed = new OperationCoordinator('uncertain-mutation-keyed', mutation);
        const keyedId = startedIdentity(keyed.start('stable'));
        keyed.dispatch({ type: 'CLIENT_VALID', identity: keyedId });
        keyed.finalize(keyedId);
        const retry = keyed.retry('automatic');
        expect(retry.kind).toBe('started');
        if (retry.kind === 'started') expect(retry.identity.idempotencyKey).toBe('stable');

        const authentication = new OperationCoordinator('uncertain-auth', profiles.authentication);
        const authId = startedIdentity(authentication.start());
        authentication.dispatch({ type: 'CLIENT_VALID', identity: authId });
        authentication.finalize(authId);
        expect(authentication.retry('user')).toEqual({ kind: 'reconciliation_required' });
    });

    it('restarts known retryable terminal state only through its retained channel', () => {
        const registry = new OperationRegistry();
        const coordinator = new OperationCoordinator('known-terminal', profiles.read, registry);
        const identity = startedIdentity(coordinator.start('stable'));
        coordinator.dispatch({ type: 'NETWORK_LOST', identity });
        const retry = coordinator.retry('user');
        expect(retry.kind).toBe('started');
        if (retry.kind === 'started') {
            expect(retry.identity.operationId).toBe(identity.operationId);
            expect(retry.identity.attemptId).not.toBe(identity.attemptId);
            expect(retry.identity.generation).toBeGreaterThan(identity.generation);
        }
    });

    it('rejects a duplicate active attempt for one logical parallel operation', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'parallel' as const };
        const coordinator = new OperationCoordinator('parallel-active', profile, registry);
        const identity = startedIdentity(coordinator.start());
        coordinator.dispatch({ type: 'CLIENT_VALID', identity });
        coordinator.dispatch({ type: 'TIMEOUT_UNKNOWN', identity });
        expect(coordinator.retry('user')).toEqual({ kind: 'active_attempt_exists' });
    });

    it('keeps claim and channel state unchanged for policy mismatch and missing authority', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'single_flight' as const };
        const owner = new OperationCoordinator('authority', profile, registry);
        const identity = startedIdentity(owner.start());
        owner.finalize(identity);
        const next = { ...identity, attemptId: `${identity.attemptId}-next`, generation: identity.generation + 1 };
        expect(registry.reacquireClaim('authority', identity, next, 'parallel', 'safe')).toEqual({
            kind: 'policy_mismatch',
        });
        const firstReplacement = registry.reacquireClaim('authority', identity, next, 'single_flight', 'safe');
        expect(firstReplacement).toEqual({
            kind: 'replaced',
            record: expect.any(Object),
        });
        if (firstReplacement.kind === 'replaced') {
            registry.release(firstReplacement.record.identity);
            registry.closeLogical(firstReplacement.record.identity);
        }
        const replacement = registry.reacquireClaim('authority', identity, {
            ...next,
            attemptId: `${next.attemptId}-again`,
            generation: next.generation + 1,
        }, 'single_flight', 'safe');
        expect(replacement).toEqual({ kind: 'claim_not_found' });
        expect(registry.reacquireClaim('authority', identity, {
            ...next,
            attemptId: `${next.attemptId}-final`,
            generation: next.generation + 2,
        }, 'single_flight', 'safe')).toEqual({ kind: 'claim_not_found' });
    });

    it('bounds claims and channels across repeated parallel uncertain lifecycles', () => {
        const registry = new OperationRegistry();
        const profile = { ...profiles.read, concurrency: 'parallel' as const };
        for (let index = 0; index < 80; index += 1) {
            const one = new OperationCoordinator(`parallel-cycle-${index}`, profile, registry);
            const two = new OperationCoordinator(`parallel-cycle-${index}`, profile, registry);
            const oneId = startedIdentity(one.start());
            const twoId = startedIdentity(two.start());
            one.finalize(oneId);
            two.finalize(twoId);
            expect(one.retry('user').kind).toBe('started');
            expect(two.retry('user').kind).toBe('started');
            if (one.getIdentity()) one.dispatch({ type: 'SUCCESS', identity: one.getIdentity()! });
            if (two.getIdentity()) two.dispatch({ type: 'SUCCESS', identity: two.getIdentity()! });
        }
        expect(registry.activeRecordCount()).toBe(0);
        expect(registry.claimCount()).toBe(0);
        expect(registry.channelCount()).toBeLessThanOrEqual(64);
        expect(registry.terminalSnapshotCount()).toBeLessThanOrEqual(64);
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

    it('preserves the coordinator retry budget across repeated blocked retries', () => {
        const registry = new OperationRegistry();
        const targetProfile = {
            ...profiles.read,
            concurrency: 'parallel' as const,
            retry: 'safe_transient' as const,
            retryBudget: 2,
        };
        const target = new OperationCoordinator('blocked-budget-repeated', targetProfile, registry);
        const first = startedIdentity(target.start());
        target.dispatch({ type: 'NETWORK_LOST', identity: first });

        const foreign = new OperationCoordinator(
            'blocked-budget-repeated',
            { ...profiles.read, concurrency: 'single_flight' as const },
            registry,
        );
        const foreignIdentity = startedIdentity(foreign.start());
        foreign.finalize(foreignIdentity);
        expect(target.retry('user')).toEqual({ kind: 'blocked_by_claim', identity: foreignIdentity });
        expect(target.retry('user')).toEqual({ kind: 'blocked_by_claim', identity: foreignIdentity });

        foreign.dispatch({ type: 'SUCCESS', identity: foreignIdentity });
        const retryOne = target.retry('user');
        expect(retryOne.kind).toBe('started');
        if (retryOne.kind !== 'started') return;
        target.dispatch({ type: 'NETWORK_LOST', identity: retryOne.identity });
        const retryTwo = target.retry('user');
        expect(retryTwo.kind).toBe('started');
        if (retryTwo.kind !== 'started') return;
        target.dispatch({ type: 'NETWORK_LOST', identity: retryTwo.identity });
        expect(target.retry('user')).toEqual({ kind: 'budget_exhausted' });
    });

    it('rejects retries at budget exhaustion without creating a new attempt', () => {
        const registry = new OperationRegistry();
        const profile = {
            ...profiles.read,
            concurrency: 'queue' as const,
            retry: 'safe_transient' as const,
            retryBudget: 2,
        };
        const timers = new TimerRegistry();
        const owner = new OperationCoordinator('budget-exhaustion', profile, registry, timers);
        const firstFollower = new OperationCoordinator('budget-exhaustion', profile, registry);
        const secondFollower = new OperationCoordinator('budget-exhaustion', profile, registry);
        const first = startedIdentity(owner.start());
        const firstQueued = firstFollower.start();
        const secondQueued = secondFollower.start();
        expect(firstQueued?.kind).toBe('queued');
        expect(secondQueued?.kind).toBe('queued');
        if (firstQueued?.kind !== 'queued' || secondQueued?.kind !== 'queued') return;
        const observed: string[] = [];
        const unsubscribe = firstQueued.subscribe((state) => observed.push(state.status));

        const completeUncertainAttempt = () => {
            const identity = owner.getIdentity()!;
            owner.dispatch({ type: 'CLIENT_VALID', identity });
            expect(owner.finalize(identity)).toEqual({ kind: 'needs_outcome_classification' });
            return owner.retry('user');
        };

        const retryOne = completeUncertainAttempt();
        expect(retryOne.kind).toBe('started');
        const retryTwo = completeUncertainAttempt();
        expect(retryTwo.kind).toBe('started');
        if (retryTwo.kind !== 'started') return;
        const identityBeforeExhaustion = retryTwo.identity;
        owner.setWatchdog(() => undefined);
        expect(timers.has(identityBeforeExhaustion)).toBe(true);
        owner.dispatch({ type: 'CLIENT_VALID', identity: identityBeforeExhaustion });
        expect(owner.finalize(identityBeforeExhaustion)).toEqual({ kind: 'needs_outcome_classification' });
        expect(timers.has(identityBeforeExhaustion)).toBe(false);
        const observedBeforeExhaustion = [...observed];
        const activeRecordsBeforeExhaustion = registry.activeRecordCount();
        const claimsBeforeExhaustion = registry.claimCount();
        const stateBeforeExhaustion = owner.getState();
        const exhausted = owner.retry('user');
        expect(exhausted).toEqual({ kind: 'budget_exhausted' });
        expect(owner.getIdentity()).toEqual(identityBeforeExhaustion);
        expect(owner.getState()).toEqual(stateBeforeExhaustion);
        expect(registry.getByIdentity(identityBeforeExhaustion)).toBeUndefined();
        expect(registry.activeRecordCount()).toBe(activeRecordsBeforeExhaustion);
        expect(registry.claimCount()).toBe(claimsBeforeExhaustion);
        expect(observed).toEqual(observedBeforeExhaustion);
        expect(timers.has(identityBeforeExhaustion)).toBe(false);
        expect(firstFollower.getState().status).toBe('queued');
        expect(secondFollower.getState().status).toBe('queued');
        expect(firstQueued.position).toBe(1);
        expect(secondQueued.position).toBe(2);
        unsubscribe();
        expect(first).toBeDefined();
    });

    it('does not consume retry budget when authority blocks the retry', () => {
        const registry = new OperationRegistry();
        const targetProfile = {
            ...profiles.read,
            concurrency: 'parallel' as const,
            retry: 'safe_transient' as const,
            retryBudget: 1,
        };
        const target = new OperationCoordinator('blocked-budget', targetProfile, registry);
        const targetIdentity = startedIdentity(target.start());
        target.dispatch({ type: 'NETWORK_LOST', identity: targetIdentity });

        const foreign = new OperationCoordinator(
            'blocked-budget',
            { ...profiles.read, concurrency: 'single_flight' as const },
            registry,
        );
        const foreignIdentity = startedIdentity(foreign.start());
        foreign.finalize(foreignIdentity);
        expect(target.retry('user')).toEqual({ kind: 'blocked_by_claim', identity: foreignIdentity });

        foreign.dispatch({ type: 'SUCCESS', identity: foreignIdentity });
        expect(target.retry('user').kind).toBe('started');
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
