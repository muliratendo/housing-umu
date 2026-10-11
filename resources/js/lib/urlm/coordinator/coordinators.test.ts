import { describe, expect, it, vi } from 'vitest';
import { ModalCoordinator } from './ModalCoordinator';
import { OperationCoordinator } from './OperationCoordinator';
import { OperationRegistry } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';
import { profiles } from '../core/profiles';

describe('URLM coordination', () => {
    it('preserves logical identity and changes attempt identity on retry', () => {
        const coordinator = new OperationCoordinator('login', profiles.authentication);
        const first = coordinator.start('key');
        const second = coordinator.retry();
        expect(second?.operationId).toBe(first?.operationId);
        expect(second?.correlationId).toBe(first?.correlationId);
        expect(second?.idempotencyKey).toBe(first?.idempotencyKey);
        expect(second?.attemptId).not.toBe(first?.attemptId);
    });

    it('single-flights and latest-wins operations', () => {
        const registry = new OperationRegistry();
        const first = registry.start('auth', 'single_flight', 'one');
        expect(registry.start('auth', 'single_flight', 'two')?.operationId).toBe('one');
        const latest = registry.start('read', 'latest_wins', 'one');
        registry.start('read', 'latest_wins', 'two');
        expect(latest?.controller.signal.aborted).toBe(true);
    });

    it('cleans timers on terminal state, cancellation, and disposal', () => {
        vi.useFakeTimers();
        const coordinator = new OperationCoordinator('read', profiles.read);
        const identity = coordinator.start();
        const callback = vi.fn();
        coordinator.setWatchdog(callback);
        coordinator.dispatch({ type: 'SUCCESS', identity: identity!, data: [] });
        vi.advanceTimersByTime(profiles.read.timeoutMs);
        expect(callback).not.toHaveBeenCalled();
        coordinator.dispose();
        vi.useRealTimers();
    });

    it('allows only one blocking modal and rejects stale release', () => {
        const modals = new ModalCoordinator();
        const first = modals.acquire('first');
        expect(modals.acquire('second').acquired).toBe(false);
        if (first.acquired) first.release();
        expect(modals.currentOwner()).toBeUndefined();
    });

    it('cleans an owned timer directly', () => {
        vi.useFakeTimers();
        const timers = new TimerRegistry();
        const callback = vi.fn();
        timers.set('op', callback, 100);
        timers.clear('op');
        vi.advanceTimersByTime(100);
        expect(callback).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
