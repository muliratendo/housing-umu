import type { Page, VisitOptions } from '@inertiajs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLoginAdapter } from './loginAdapter';
import { profiles } from '../core/profiles';
import { applicationOperationRegistry, OperationRegistry } from '../coordinator/OperationRegistry';
import { TimerRegistry } from '../coordinator/TimerRegistry';

type CapturedVisit = {
    url: string;
    options: VisitOptions;
};

const page = (component: string, userId?: string | number): Page =>
    ({
        component,
        props: userId === undefined ? { auth: { user: null } } : { auth: { user: { id: userId } } },
        url: '/login',
        version: null,
        clearHistory: false,
        encryptHistory: false,
        deferredProps: {},
        errors: {},
        flash: {},
        rememberedState: {},
    }) as unknown as Page;

const captureVisit = () => {
    const visits: CapturedVisit[] = [];
    const adapter = createLoginAdapter((url, options) => {
        visits.push({ url, options });
    }, new OperationRegistry(), new TimerRegistry());
    return { adapter, visits };
};

const startVisit = (adapter: ReturnType<typeof createLoginAdapter>, visits: CapturedVisit[]) => {
    const result = adapter.start('student@example.test', 'secret-value', false);
    expect(result.kind).toBe('started');
    expect(visits).toHaveLength(1);
    return visits[0].options;
};

describe('login adapter contract', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses the accepted authentication profile without changing its repeat-safety contract', () => {
        expect(profiles.authentication).toMatchObject({
            retry: 'never',
            repeatSafety: 'never',
            concurrency: 'single_flight',
            retryBudget: 0,
        });
    });

    it('sends one transport visit for duplicate triggers and uses legal start transitions', () => {
        const { adapter, visits } = captureVisit();
        const first = adapter.start('student@example.test', 'secret-value', false);
        const second = adapter.start('student@example.test', 'secret-value', false);

        expect(first.kind).toBe('started');
        expect(second.kind).toBe('already_active');
        expect(visits).toHaveLength(1);

        const states: string[] = [];
        const unsubscribe = adapter.subscribe((state) => states.push(state.status));
        visits[0].options.onStart?.({} as never);

        expect(states.at(-1)).toBe('submitting');
        unsubscribe();
        adapter.dispose();
    });

    it('maps scoped server validation and never stores the supplied password', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        options.onStart?.({} as never);
        options.onError?.({ email: 'Invalid credentials' });

        expect(adapter.getState()).toMatchObject({
            status: 'validation_failed',
            fieldErrors: { email: ['Invalid credentials'] },
        });
        expect(JSON.stringify(adapter.getState())).not.toContain('secret-value');
        adapter.dispose();
    });

    it('accepts success only from authenticated page facts', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        options.onStart?.({} as never);
        options.onSuccess?.(page('Student/Dashboard', 42));

        expect(adapter.getState()?.status).toBe('succeeded');
        options.onFinish?.({} as never);
        adapter.dispose();
    });

    it('keeps verification-required navigation distinct from dashboard success', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        options.onStart?.({} as never);
        options.onSuccess?.(page('Auth/VerifyEmail'));

        expect(adapter.getState()?.status).toBe('auth_required');
        options.onFinish?.({} as never);
        adapter.dispose();
    });

    it('leaves an unexpected guest result unresolved and uses finish for cleanup only', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        options.onStart?.({} as never);
        options.onSuccess?.(page('Auth/Login'));

        expect(adapter.getState()?.status).toBe('submitting');
        options.onFinish?.({} as never);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        adapter.dispose();
    });

    it('cancels once before finish and ignores callbacks after final cleanup', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({ cancel: () => { cancelCount += 1; options.onCancel?.(); } });

        adapter.cancel();
        adapter.cancel();
        expect(cancelCount).toBe(1);
        expect(adapter.getState()?.status).toBe('cancelled');

        options.onFinish?.({} as never);
        options.onSuccess?.(page('Student/Dashboard', 42));
        expect(adapter.getState()?.status).toBe('cancelled');
        adapter.dispose();
    });

    it('uses coordinator-owned cancellation when disposed and does not cancel on detach', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({ cancel: () => { cancelCount += 1; } });

        adapter.detachView();
        expect(cancelCount).toBe(0);
        expect(adapter.dispose()).toEqual({ kind: 'cancelled' });
        expect(cancelCount).toBe(1);
        expect(adapter.dispose()).toEqual({ kind: 'disposed' });
    });

    it('does not let cancellation reentrancy invoke the token twice', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({
            cancel: () => {
                cancelCount += 1;
                options.onCancel?.();
            },
        });

        expect(adapter.cancel()).toEqual({ kind: 'cancelled' });
        expect(adapter.cancel()).toEqual({ kind: 'not_active' });
        expect(cancelCount).toBe(1);
    });

    it('finalizes after a watchdog token throws and releases exact resources', () => {
        vi.useFakeTimers();
        const registry = new OperationRegistry();
        const timers = new TimerRegistry();
        const { adapter, visits } = (() => {
            const captured: CapturedVisit[] = [];
            return {
                adapter: createLoginAdapter((url, options) => captured.push({ url, options }), registry, timers),
                visits: captured,
            };
        })();
        startVisit(adapter, visits).onCancelToken?.({
            cancel: () => { throw new Error('secret-in-cancel-token'); },
        });

        vi.advanceTimersByTime(profiles.authentication.timeoutMs);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        expect(adapter.getIdentity()).toBeDefined();
        expect(registry.activeRecordCount()).toBe(0);
        expect(registry.claimCount()).toBe(1);
        expect(timers.has(adapter.getIdentity()!)).toBe(false);
        expect(JSON.stringify(adapter.getState())).not.toContain('secret-in-cancel-token');
        adapter.dispose();
        expect(registry.claimCount()).toBe(0);
    });

    it('handles a token that synchronously delivers cancel and finish', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({
            cancel: () => {
                cancelCount += 1;
                options.onCancel?.();
                options.onFinish?.({} as never);
            },
        });

        expect(adapter.cancel()).toEqual({ kind: 'cancelled' });
        expect(cancelCount).toBe(1);
        expect(adapter.getState()?.status).toBe('cancelled');
        expect(adapter.cancel()).toEqual({ kind: 'not_active' });
    });

    it('handles reentrant cancellation during disposal without leaking the attempt', () => {
        const registry = new OperationRegistry();
        const { adapter, visits } = (() => {
            const captured: CapturedVisit[] = [];
            return {
                adapter: createLoginAdapter((url, options) => captured.push({ url, options }), registry, new TimerRegistry()),
                visits: captured,
            };
        })();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({
            cancel: () => {
                cancelCount += 1;
                options.onCancel?.();
                options.onFinish?.({} as never);
            },
        });

        expect(adapter.dispose()).toEqual({ kind: 'cancelled' });
        expect(cancelCount).toBe(1);
        expect(adapter.getState()?.status).toBe('cancelled');
        expect(registry.activeRecordCount()).toBe(0);
    });

    it('handles reentrant watchdog cancellation conservatively', () => {
        vi.useFakeTimers();
        const registry = new OperationRegistry();
        const timers = new TimerRegistry();
        const { adapter, visits } = (() => {
            const captured: CapturedVisit[] = [];
            return {
                adapter: createLoginAdapter((url, options) => captured.push({ url, options }), registry, timers),
                visits: captured,
            };
        })();
        const options = startVisit(adapter, visits);
        let cancelCount = 0;
        options.onCancelToken?.({
            cancel: () => {
                cancelCount += 1;
                options.onCancel?.();
                options.onFinish?.({} as never);
            },
        });

        vi.advanceTimersByTime(profiles.authentication.timeoutMs);

        expect(cancelCount).toBe(1);
        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        expect(registry.activeRecordCount()).toBe(0);
        expect(timers.has(adapter.getIdentity()!)).toBe(false);
    });

    it('keeps transport classification alive after view detachment', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        const states: string[] = [];
        adapter.subscribe((state) => states.push(state.status));

        adapter.detachView();
        options.onStart?.({} as never);
        options.onSuccess?.(page('Student/Dashboard', 42));
        options.onFinish?.({} as never);

        expect(adapter.getState()?.status).toBe('succeeded');
        expect(states).toHaveLength(1);
        adapter.dispose();
    });

    it('does not consume unattributable global events and cleans an unknown detached visit', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        adapter.detachView();
        options.onFinish?.({} as never);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        adapter.dispose();
        expect(adapter.getState()?.status).toBe('abandoned');
    });

    it('cleans a synchronous visit throw without exposing the thrown secret', () => {
        const secret = 'secret-in-thrown-error';
        const adapter = createLoginAdapter(() => {
            throw new Error(secret);
        }, new OperationRegistry(), new TimerRegistry());

        adapter.start('student@example.test', secret, false);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        expect(JSON.stringify(adapter.getState())).not.toContain(secret);
        expect(adapter.start('student@example.test', secret, false).kind).toBe('already_owner');
        adapter.dispose();
    });

    it('uses the application registry for single-flight across separate adapters', () => {
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }));
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }));

        const first = adapterA.start('student@example.test', 'secret-value', false);
        const joined = adapterB.start('student@example.test', 'secret-value', false);

        expect(first.kind).toBe('started');
        expect(joined.kind).toBe('joined');
        expect(visitsA).toHaveLength(1);
        expect(visitsB).toHaveLength(0);
        expect(adapterB.cancel()).toEqual({ kind: 'not_active' });
        const joinedStates: string[] = [];
        const unsubscribe = adapterB.subscribe((state) => joinedStates.push(state.status));
        expect(joinedStates).toEqual(['validating']);
        unsubscribe();

        adapterB.dispose();
        expect(adapterA.dispose()).toEqual({ kind: 'cancelled' });
        expect(applicationOperationRegistry.activeRecordCount()).toBe(0);
    });

    it('lets a joined observer follow an active owner without cancellation authority', () => {
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }));
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }));
        expect(adapterA.start('student@example.test', 'secret-value', false).kind).toBe('started');
        expect(adapterB.start('student@example.test', 'secret-value', false).kind).toBe('joined');
        const states: string[] = [];
        adapterB.subscribe((state) => states.push(state.status));
        visitsA[0].options.onStart?.({} as never);
        visitsA[0].options.onSuccess?.(page('Student/Dashboard', 42));

        expect(states).toEqual(['validating', 'submitting', 'succeeded']);
        expect(adapterB.cancel()).toEqual({ kind: 'not_active' });
        adapterB.dispose();
        adapterA.dispose();
    });

    it('lets a joined observer follow an awaiting logical lifecycle to owner abandonment', () => {
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }));
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }));
        expect(adapterA.start('student@example.test', 'secret-value', false).kind).toBe('started');
        visitsA[0].options.onFinish?.({} as never);
        expect(adapterA.getState()?.status).toBe('awaiting_outcome');
        expect(adapterB.start('student@example.test', 'secret-value', false).kind).toBe('joined');
        const states: string[] = [];
        adapterB.subscribe((state) => states.push(state.status));

        adapterA.dispose();

        expect(states).toEqual(['awaiting_outcome', 'abandoned']);
        expect(adapterB.cancel()).toEqual({ kind: 'not_active' });
        adapterB.dispose();
    });

    it('keeps late callbacks from attempt A from changing attempt B on one adapter', () => {
        const { adapter, visits } = captureVisit();
        adapter.start('a@example.test', 'a-secret', false);
        const optionsA = visits[0].options;
        optionsA.onStart?.({} as never);
        optionsA.onError?.({ email: 'Invalid credentials' });
        optionsA.onFinish?.({} as never);
        expect(adapter.start('b@example.test', 'b-secret', false).kind).toBe('started');
        const optionsB = visits[1].options;
        let bCancelCount = 0;
        optionsB.onCancelToken?.({ cancel: () => { bCancelCount += 1; } });
        optionsA.onCancelToken?.({ cancel: () => { throw new Error('stale A token used'); } });
        optionsA.onFinish?.({} as never);
        optionsB.onStart?.({} as never);
        expect(adapter.getState()?.status).toBe('submitting');
        expect(bCancelCount).toBe(0);
        adapter.cancel();
        expect(bCancelCount).toBe(1);
        adapter.dispose();
    });

    it('enters conservative recovery when the visit never finishes', () => {
        vi.useFakeTimers();
        const { adapter, visits } = captureVisit();
        startVisit(adapter, visits);

        vi.advanceTimersByTime(profiles.authentication.timeoutMs);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        expect(adapter.start('student@example.test', 'secret-value', false).kind).toBe('already_owner');
        adapter.dispose();
    });

    it('ignores a stale watchdog after a later lifecycle starts', () => {
        vi.useFakeTimers();
        const { adapter, visits } = captureVisit();
        const optionsA = startVisit(adapter, visits);
        optionsA.onStart?.({} as never);
        optionsA.onError?.({ email: 'Invalid credentials' });
        optionsA.onFinish?.({} as never);
        const second = adapter.start('student@example.test', 'secret-value', false);
        expect(second.kind).toBe('started');
        visits[1].options.onStart?.({} as never);

        vi.advanceTimersByTime(profiles.authentication.timeoutMs);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        adapter.dispose();
    });

    it('keeps a staggered B watchdog pending at A deadline', () => {
        vi.useFakeTimers();
        const registryA = new OperationRegistry();
        const registryB = new OperationRegistry();
        const timersA = new TimerRegistry();
        const timersB = new TimerRegistry();
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }), registryA, timersA);
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }), registryB, timersB);
        adapterA.start('a@example.test', 'a-secret', false);
        visitsA[0].options.onStart?.({} as never);
        vi.advanceTimersByTime(10);
        adapterB.start('b@example.test', 'b-secret', false);
        visitsB[0].options.onStart?.({} as never);
        let bCancelCount = 0;
        visitsB[0].options.onCancelToken?.({ cancel: () => { bCancelCount += 1; } });

        vi.advanceTimersByTime(profiles.authentication.timeoutMs - 10);
        expect(adapterA.getState()?.status).toBe('awaiting_outcome');
        expect(adapterB.getState()?.status).toBe('submitting');
        expect(bCancelCount).toBe(0);

        vi.advanceTimersByTime(10);
        expect(adapterB.getState()?.status).toBe('awaiting_outcome');
        expect(bCancelCount).toBe(1);
        adapterA.dispose();
        adapterB.dispose();
    });

    it('releases local resources when success, validation, or cancellation has no finish', () => {
        const success = captureVisit();
        const successOptions = startVisit(success.adapter, success.visits);
        successOptions.onStart?.({} as never);
        successOptions.onSuccess?.(page('Student/Dashboard', 42));
        expect(success.adapter.start('student@example.test', 'secret-value', false).kind).toBe('started');
        success.adapter.dispose();

        const validation = captureVisit();
        const validationOptions = startVisit(validation.adapter, validation.visits);
        validationOptions.onStart?.({} as never);
        validationOptions.onError?.({ email: 'Invalid credentials' });
        expect(validation.adapter.start('student@example.test', 'secret-value', false).kind).toBe('started');
        validation.adapter.dispose();

        const cancelled = captureVisit();
        const cancelledOptions = startVisit(cancelled.adapter, cancelled.visits);
        cancelledOptions.onCancelToken?.({ cancel: () => undefined });
        expect(cancelled.adapter.cancel()).toEqual({ kind: 'cancelled' });
        expect(cancelled.adapter.start('student@example.test', 'secret-value', false).kind).toBe('started');
        cancelled.adapter.dispose();
    });

    it('delivers snapshots immediately, isolates listener faults, and supports reattach', () => {
        const { adapter, visits } = captureVisit();
        startVisit(adapter, visits);
        const received: string[] = [];
        const unsubscribe = adapter.subscribe(() => { throw new Error('listener failure'); });
        adapter.subscribe((state) => received.push(state.status));

        expect(received).toEqual(['validating']);
        unsubscribe();
        adapter.detachView();
        adapter.subscribe((state) => received.push(`reattached:${state.status}`));
        expect(received.at(-1)).toBe('reattached:validating');
        adapter.dispose();
    });

    it('rejects malformed authenticated facts without claiming success', () => {
        const { adapter, visits } = captureVisit();
        const options = startVisit(adapter, visits);
        options.onStart?.({} as never);
        options.onSuccess?.(page('Student/Dashboard'));
        options.onFinish?.({} as never);

        expect(adapter.getState()?.status).toBe('awaiting_outcome');
        adapter.dispose();
    });

    it('distinguishes a valid guest page from malformed facts and contains throwing input access', () => {
        const guest = captureVisit();
        const guestOptions = startVisit(guest.adapter, guest.visits);
        guestOptions.onStart?.({} as never);
        guestOptions.onSuccess?.(page('Auth/Login'));
        expect(guest.adapter.getState()?.status).toBe('submitting');
        guestOptions.onFinish?.({} as never);
        expect(guest.adapter.getState()?.status).toBe('awaiting_outcome');
        guest.adapter.dispose();

        const malformed = captureVisit();
        const malformedPage = { component: 'Student/Dashboard' } as Page;
        Object.defineProperty(malformedPage, 'props', {
            get: () => { throw new Error('raw response secret'); },
        });
        const malformedOptions = startVisit(malformed.adapter, malformed.visits);
        malformedOptions.onStart?.({} as never);
        expect(() => malformedOptions.onSuccess?.(malformedPage)).not.toThrow();
        expect(malformed.adapter.getState()?.status).toBe('awaiting_outcome');
        expect(JSON.stringify(malformed.adapter.getState())).not.toContain('raw response secret');
        malformed.adapter.dispose();
    });
});
