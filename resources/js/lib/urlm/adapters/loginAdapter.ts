import type { Page, VisitOptions } from '@inertiajs/core';
import type { FieldErrors, OperationState, RequestIdentity } from '../core/contracts';
import type { OperationEvent } from '../core/events';
import { sameIdentity } from '../core/identity';
import { profiles } from '../core/profiles';
import { OperationCoordinator } from '../coordinator/OperationCoordinator';
import { applicationOperationRegistry, OperationRegistry } from '../coordinator/OperationRegistry';
import { TimerRegistry } from '../coordinator/TimerRegistry';

type LoginPageFacts = {
    component: string;
    authenticated: boolean;
    verificationRequired: boolean;
    guest: boolean;
    malformed: boolean;
};

type LoginTransport = (url: string, options: VisitOptions) => void;
type ViewListener = (state: OperationState<LoginPageFacts>) => void;

type AttemptRecord = {
    identity: RequestIdentity;
    active: boolean;
    cancelToken?: () => void;
    cancelRequested: boolean;
    cancelCalled: boolean;
    unregisterCancellation: () => void;
};

type AdapterResult =
    | { kind: 'cancelled' }
    | { kind: 'not_active' }
    | { kind: 'already_terminal' }
    | { kind: 'disposed' };

export type LoginAdapter = ReturnType<typeof createLoginAdapter>;

const isCurrentAttempt = (
    coordinator: OperationCoordinator<LoginPageFacts>,
    attempt: AttemptRecord,
    disposed: boolean,
): boolean =>
    !disposed &&
    attempt.active &&
    coordinator.getIdentity() !== undefined &&
    sameIdentity(coordinator.getIdentity()!, attempt.identity);

const safeNotify = <T>(listener: (value: T) => void, value: T): void => {
    try { listener(value); } catch { /* one view cannot interrupt lifecycle cleanup */ }
};

const pageFacts = (page: Page): LoginPageFacts => {
    const rawProps = page.props;
    if (!rawProps || typeof rawProps !== 'object') {
        return { component: page.component, authenticated: false, verificationRequired: false, guest: false, malformed: true };
    }

    const props = rawProps as { auth?: { user?: { id?: string | number } | null }; verificationRequired?: unknown };
    const user = props.auth?.user;
    const authenticated = typeof user === 'object' &&
        user !== null &&
        (typeof user.id === 'string' || typeof user.id === 'number');
    const verificationRequired = props.verificationRequired === true || page.component === 'Auth/VerifyEmail';
    const guest = user === null;

    return {
        component: page.component,
        authenticated,
        verificationRequired,
        guest,
        malformed: !props.auth || (user !== null && !authenticated),
    };
};

export const createLoginAdapter = (
    visit: LoginTransport,
    registry: OperationRegistry = applicationOperationRegistry,
    timers = new TimerRegistry(),
) => {
    const coordinator = new OperationCoordinator<LoginPageFacts>(
        'auth.login',
        profiles.authentication,
        registry,
        timers,
    );
    const listeners = new Set<ViewListener>();
    let channelUnsubscribe: (() => void) | undefined;
    let currentAttempt: AttemptRecord | undefined;
    let joinedIdentity: RequestIdentity | undefined;
    let disposed = false;

    const publish = (state: OperationState<LoginPageFacts>) => {
        for (const listener of [...listeners]) safeNotify(listener, state);
    };

    const attachChannel = (identity: RequestIdentity) => {
        channelUnsubscribe?.();
        channelUnsubscribe = registry.observe(identity, (state) => publish(state as OperationState<LoginPageFacts>));
    };

    const dispatchOwned = (attempt: AttemptRecord, event: OperationEvent<LoginPageFacts>) => {
        if (isCurrentAttempt(coordinator, attempt, disposed)) coordinator.dispatch(event);
    };

    const finishAttempt = (attempt: AttemptRecord, cancelTransport = false): void => {
        if (!isCurrentAttempt(coordinator, attempt, disposed)) return;
        attempt.active = false;
        currentAttempt = undefined;
        attempt.unregisterCancellation();
        const cancel = attempt.cancelToken;
        attempt.cancelToken = undefined;
        if (cancelTransport && cancel && !attempt.cancelCalled) {
            attempt.cancelCalled = true;
            cancel();
        }
        coordinator.finalize(attempt.identity);
    };

    const start = (email: string, password: string, remember: boolean) => {
        if (disposed) return { kind: 'disposed' as const };
        if (currentAttempt?.active) return { kind: 'already_active' as const };

        const result = coordinator.start();
        if (result.kind === 'joined') {
            joinedIdentity = result.identity;
            attachChannel(result.identity);
            return result;
        }
        if (result.kind !== 'started') return result;

        const attempt: AttemptRecord = {
            identity: result.identity,
            active: true,
            cancelRequested: false,
            cancelCalled: false,
            unregisterCancellation: () => undefined,
        };
        currentAttempt = attempt;
        attachChannel(attempt.identity);
        attempt.unregisterCancellation = coordinator.registerCancellation(() => {
            attempt.cancelRequested = true;
            if (!attempt.cancelCalled && attempt.cancelToken) {
                attempt.cancelCalled = true;
                const cancel = attempt.cancelToken;
                attempt.cancelToken = undefined;
                cancel();
            }
        });

        const options: VisitOptions = {
            method: 'post',
            data: { email, password, remember },
            onStart: () => dispatchOwned(attempt, { type: 'CLIENT_VALID', identity: attempt.identity }),
            onCancelToken: (token) => {
                if (!isCurrentAttempt(coordinator, attempt, disposed)) return;
                if (attempt.cancelRequested) {
                    if (!attempt.cancelCalled) {
                        attempt.cancelCalled = true;
                        token.cancel();
                    }
                    return;
                }
                attempt.cancelToken = token.cancel;
            },
            onSuccess: (page) => {
                if (!isCurrentAttempt(coordinator, attempt, disposed)) return;
                const facts = pageFacts(page);
                if (facts.authenticated && !facts.verificationRequired && !facts.malformed) {
                    dispatchOwned(attempt, { type: 'SUCCESS', identity: attempt.identity, data: facts });
                } else if (facts.verificationRequired) {
                    dispatchOwned(attempt, { type: 'AUTH_LOST', identity: attempt.identity });
                }
            },
            onError: (errors) => {
                if (!isCurrentAttempt(coordinator, attempt, disposed)) return;
                const fieldErrors: FieldErrors = Object.fromEntries(
                    Object.entries(errors).map(([field, value]) => [
                        field,
                        Array.isArray(value) ? value.map(String) : [String(value)],
                    ]),
                );
                dispatchOwned(attempt, { type: 'SERVER_VALIDATION', identity: attempt.identity, fieldErrors });
            },
            onCancel: () => dispatchOwned(attempt, {
                type: 'CANCEL',
                identity: attempt.identity,
                cause: 'transport',
            }),
            onFinish: () => finishAttempt(attempt),
        };

        try {
            visit('/login', options);
        } catch {
            finishAttempt(attempt, true);
        }
        if (isCurrentAttempt(coordinator, attempt, disposed)) {
            coordinator.setWatchdog(() => {
                if (!isCurrentAttempt(coordinator, attempt, disposed)) return;
                coordinator.dispatch({ type: 'TIMEOUT_UNKNOWN', identity: attempt.identity });
                finishAttempt(attempt, true);
            });
        }
        return result;
    };

    const subscribe = (listener: ViewListener) => {
        if (disposed) return () => undefined;
        listeners.add(listener);
        const state = coordinator.getState();
        if (state.status !== 'idle') safeNotify(listener, state);
        else if (joinedIdentity) {
            const joinedState = registry.getState(joinedIdentity) as OperationState<LoginPageFacts> | undefined;
            if (joinedState) safeNotify(listener, joinedState);
        }
        return () => listeners.delete(listener);
    };

    const cancel = (): AdapterResult => {
        if (disposed) return { kind: 'disposed' };
        if (!currentAttempt?.active) return { kind: 'not_active' };
        const result = coordinator.cancel('user');
        return result.kind === 'cancelled'
            ? { kind: 'cancelled' }
            : result.kind === 'already_terminal'
                ? { kind: 'already_terminal' }
                : { kind: 'not_active' };
    };

    const detachView = () => {
        listeners.clear();
    };

    const dispose = (): AdapterResult => {
        if (disposed) return { kind: 'disposed' };
        disposed = true;
        const hadActiveAttempt = currentAttempt?.active === true;
        coordinator.dispose();
        channelUnsubscribe?.();
        channelUnsubscribe = undefined;
        listeners.clear();
        if (currentAttempt) {
            currentAttempt.active = false;
            currentAttempt.cancelToken = undefined;
            currentAttempt.unregisterCancellation();
            currentAttempt = undefined;
        }
        return hadActiveAttempt ? { kind: 'cancelled' } : { kind: 'disposed' };
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
