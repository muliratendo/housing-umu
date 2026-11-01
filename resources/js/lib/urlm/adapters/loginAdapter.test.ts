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
        expect(adapter.cancel()).toEqual({ kind: 'already_terminal' });
        expect(cancelCount).toBe(1);
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

    it('keeps A cleanup from changing B after A completes and B starts', () => {
        const registry = new OperationRegistry();
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }), registry, new TimerRegistry());
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }), registry, new TimerRegistry());

        adapterA.start('a@example.test', 'a-secret', false);
        const optionsA = visitsA[0].options;
        optionsA.onStart?.({} as never);
        optionsA.onSuccess?.(page('Student/Dashboard', 1));
        adapterB.start('b@example.test', 'b-secret', false);
        const optionsB = visitsB[0].options;
        optionsA.onCancelToken?.({ cancel: () => undefined });
        optionsA.onFinish?.({} as never);

        expect(adapterB.getState()?.status).toBe('validating');
        optionsB.onStart?.({} as never);
        expect(adapterB.getState()?.status).toBe('submitting');
        adapterA.dispose();
        adapterB.dispose();
    });

    it('does not let a late A token replace B token', () => {
        const registry = new OperationRegistry();
        const visitsA: CapturedVisit[] = [];
        const visitsB: CapturedVisit[] = [];
        const adapterA = createLoginAdapter((url, options) => visitsA.push({ url, options }), registry, new TimerRegistry());
        const adapterB = createLoginAdapter((url, options) => visitsB.push({ url, options }), registry, new TimerRegistry());

        adapterA.start('a@example.test', 'a-secret', false);
        const optionsA = visitsA[0].options;
        optionsA.onStart?.({} as never);
        optionsA.onSuccess?.(page('Student/Dashboard', 1));
        optionsA.onFinish?.({} as never);
        adapterB.start('b@example.test', 'b-secret', false);
        const optionsB = visitsB[0].options;
        let bCancelCount = 0;
        optionsB.onCancelToken?.({ cancel: () => { bCancelCount += 1; } });
        optionsA.onCancelToken?.({ cancel: () => { throw new Error('stale token used'); } });

        adapterB.cancel();
        expect(bCancelCount).toBe(1);
        adapterA.dispose();
        adapterB.dispose();
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
});
