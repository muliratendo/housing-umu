import type { Page, VisitOptions } from '@inertiajs/core';
import type { FieldErrors, OperationState, RequestIdentity } from '../core/contracts';
import type { OperationEvent } from '../core/events';
import { profiles } from '../core/profiles';
import { OperationCoordinator } from '../coordinator/OperationCoordinator';
import { OperationRegistry } from '../coordinator/OperationRegistry';
import { TimerRegistry } from '../coordinator/TimerRegistry';

type LoginPageFacts = {
    component: string;
    authenticatedUserId?: string | number;
    verificationRequired?: boolean;
    guest?: boolean;
};

type LoginTransport = (
    url: string,
    options: VisitOptions,
) => void;

type ViewListener = (state: OperationState<LoginPageFacts>) => void;

export type LoginAdapter = ReturnType<typeof createLoginAdapter>;

const isOwned = (coordinator: OperationCoordinator<LoginPageFacts>, identity: RequestIdentity): boolean => {
    const active = coordinator.getIdentity();
    return active !== undefined &&
        active.operationId === identity.operationId &&
        active.attemptId === identity.attemptId &&
        active.correlationId === identity.correlationId &&
        active.generation === identity.generation &&
        active.idempotencyKey === identity.idempotencyKey;
};

const pageFacts = (page: Page): LoginPageFacts => {
    const props = page.props as {
        auth?: { user?: { id?: string | number } | null };
        verificationRequired?: boolean;
    };
    return {
        component: page.component,
        authenticatedUserId: props.auth?.user?.id,
        verificationRequired: props.verificationRequired,
        guest: props.auth?.user === null || props.auth?.user === undefined,
    };
};

const isAuthenticatedPage = (facts: LoginPageFacts): boolean =>
    facts.authenticatedUserId !== undefined &&
    facts.component !== 'Auth/Login' &&
    facts.component !== 'Auth/VerifyEmail';

export const createLoginAdapter = (
    visit: LoginTransport,
    registry = new OperationRegistry(),
    timers = new TimerRegistry(),
) => {
    const coordinator = new OperationCoordinator<LoginPageFacts>(
        'auth.login',
        profiles.authentication,
        registry,
        timers,
    );
    const listeners = new Set<ViewListener>();
    let unsubscribe: (() => void) | undefined;
    let transportActive = false;
    let transportCancel: (() => void) | undefined;
    let cleaned = false;

    const publish = (state: OperationState<LoginPageFacts>) => {
        for (const listener of [...listeners]) listener(state);
    };

    const dispatchOwned = (identity: RequestIdentity, event: OperationEvent<LoginPageFacts>) => {
        if (!cleaned && isOwned(coordinator, identity)) coordinator.dispatch(event);
    };

    const start = (email: string, password: string, remember: boolean) => {
        if (cleaned || transportActive) return { kind: 'already_active' as const };
        const result = coordinator.start();
        if (result.kind !== 'started') return result;
        const identity = result.identity;
        transportActive = true;
        unsubscribe = registry.observe(identity, (state) => publish(state as OperationState<LoginPageFacts>));
        visit('/login', {
            method: 'post',
            data: { email, password, remember },
            onStart: () => dispatchOwned(identity, { type: 'CLIENT_VALID', identity }),
            onCancelToken: (token) => {
                if (isOwned(coordinator, identity)) transportCancel = token.cancel;
            },
            onSuccess: (page) => {
                const facts = pageFacts(page);
                if (isAuthenticatedPage(facts)) {
                    dispatchOwned(identity, { type: 'SUCCESS', identity, data: facts });
                } else if (facts.verificationRequired || facts.component === 'Auth/VerifyEmail') {
                    dispatchOwned(identity, { type: 'AUTH_LOST', identity });
                }
            },
            onError: (errors) => {
                const fieldErrors: FieldErrors = Object.fromEntries(
                    Object.entries(errors).map(([field, value]) => [
                        field,
                        Array.isArray(value) ? value.map(String) : [String(value)],
                    ]),
                );
                dispatchOwned(identity, { type: 'SERVER_VALIDATION', identity, fieldErrors });
            },
            onCancel: () => dispatchOwned(identity, {
                type: 'CANCEL',
                identity,
                cause: 'transport',
            }),
            onFinish: () => {
                transportActive = false;
                transportCancel = undefined;
                coordinator.finalize(identity);
            },
        });
        return result;
    };

    const subscribe = (listener: ViewListener) => {
        if (cleaned) return () => undefined;
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const cancel = () => {
        if (!transportActive || !transportCancel) return;
        const cancelTransport = transportCancel;
        transportCancel = undefined;
        cancelTransport();
    };

    const detachView = () => {
        unsubscribe?.();
        unsubscribe = undefined;
        listeners.clear();
    };

    const dispose = () => {
        if (cleaned) return;
        cleaned = true;
        detachView();
        transportCancel = undefined;
        coordinator.dispose();
    };

    return {
        start,
        subscribe,
        detachView,
        cancel,
        dispose,
        getState: () => coordinator.getState(),
        getIdentity: () => coordinator.getIdentity(),
    };
};
