import { describe, expect, it, vi } from 'vitest';
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
});
