import type { Page, VisitOptions } from '@inertiajs/core';
import { describe, expect, it } from 'vitest';
import { createLoginAdapter } from './loginAdapter';
import { profiles } from '../core/profiles';

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
    });
    return { adapter, visits };
};

const startVisit = (adapter: ReturnType<typeof createLoginAdapter>, visits: CapturedVisit[]) => {
    const result = adapter.start('student@example.test', 'secret-value', false);
    expect(result.kind).toBe('started');
    expect(visits).toHaveLength(1);
    return visits[0].options;
};

describe('login adapter contract', () => {
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
        expect(states).toHaveLength(0);
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
});
