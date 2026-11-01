import { StrictMode, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Page, VisitOptions } from '@inertiajs/core';
import Login from '../../Pages/Auth/Login';
import { OperationRegistry } from '../../lib/urlm/coordinator/OperationRegistry';

type CapturedVisit = {
    url: string;
    options: VisitOptions;
};

const visits: CapturedVisit[] = [];

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
        <a href={href}>{children}</a>,
    router: {
        visit: (url: string, options: VisitOptions) => {
            visits.push({ url, options });
        },
    },
    useForm: () => {
        const [data, setDataState] = useState({
            email: '',
            password: '',
            remember: false,
        });
        const [errors, setErrors] = useState<Record<string, string>>({});
        const setData = useCallback((field: string, value: string | boolean) => {
            setDataState((current) => ({ ...current, [field]: value }));
        }, []);
        const clearErrors = useCallback((field: string) => setErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        }), []);
        const reset = useCallback((field?: string) => {
            if (field) setDataState((current) => ({ ...current, [field]: '' }));
            else setDataState({ email: '', password: '', remember: false });
        }, []);
        return {
            data,
            setData,
            post: vi.fn(),
            processing: false,
            errors,
            clearErrors,
            reset,
        };
    },
}));

vi.mock('ziggy-js', () => ({
    route: (name: string) => name === 'login' ? '/login' : `/${name}`,
}));

vi.mock('@/Layouts/GuestLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
        <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
        <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({ checked, onCheckedChange }: {
        checked: boolean;
        onCheckedChange: (checked: boolean) => void;
    }) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            aria-label="Keep me signed in on this device"
        />
    ),
}));

vi.mock('@/components/auth/PasswordInput', () => ({
    PasswordInput: ({ hasError: _hasError, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
        hasError?: boolean;
    }) => <input {...props} type="password" />,
}));

vi.mock('@/components/auth/BackToHome', () => ({ BackToHome: () => null }));
vi.mock('@/components/states/LoadingIndicator', () => ({
    LoadingIndicator: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('@/components/states/SuccessState', () => ({ SuccessState: () => null }));
vi.mock('@/components/states/ErrorState', () => ({
    ErrorState: ({
        userMessage,
        primaryAction,
    }: {
        userMessage: string;
        primaryAction?: { label: string; href?: string; onClick?: () => void };
    }) => (
        <div role="alert">
            {userMessage}
            {primaryAction?.href ? (
                <a href={primaryAction.href}>{primaryAction.label}</a>
            ) : primaryAction ? (
                <button type="button" onClick={primaryAction.onClick}>{primaryAction.label}</button>
            ) : null}
        </div>
    ),
}));
vi.mock('@/lib/classifyError', () => ({
    classifyError: () => ({ reasonCode: 'VALIDATION_FAILED', placement: 'inline' }),
}));
vi.mock('@/components/states/StaleFailureGuard', () => ({
    useSilentFailureGuard: () => ({
        isRunning: false,
        suspectedSilentFailure: false,
        run: vi.fn(),
        resubmit: vi.fn(),
    }),
}));

const page = (component: string, userId?: string | number): Page => ({
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
} as unknown as Page);

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByRole('textbox', { name: 'University email' }), 'student@example.test');
    await user.type(screen.getByLabelText('Password'), 'secret-value');
};

const renderLogin = () => render(
    <Login integration="urlm" adapterRegistry={new OperationRegistry()} />,
);

describe('login React/adapter integration', () => {
    afterEach(() => {
        visits.length = 0;
    });

    it('sends no POST for client-invalid input', async () => {
        const user = userEvent.setup();
        renderLogin();

        fireEvent.submit(screen.getByRole('form', { name: 'Sign in form' }));

        expect(visits).toHaveLength(0);
        expect(screen.getByText('Complete your email and password before logging in.')).toBeTruthy();
    });

    it('sends exactly one visit and exposes accessible pending feedback for duplicate submits', async () => {
        const user = userEvent.setup();
        renderLogin();
        await fillValidForm(user);

        const button = screen.getByRole('button', { name: 'Log in' });
        await user.click(button);
        await user.click(button);

        expect(visits).toHaveLength(1);
        visits[0].options.onStart?.({} as never);
        await waitFor(() => expect(screen.getByRole('form', { name: 'Sign in form' }).getAttribute('aria-busy')).toBe('true'));
        visits[0].options.onError?.({ email: 'Invalid credentials' });
    });

    it('renders scoped server validation and permits a fresh explicit submission', async () => {
        const user = userEvent.setup();
        renderLogin();
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));

        visits[0].options.onStart?.({} as never);
        visits[0].options.onError?.({ email: 'Invalid credentials' });
        await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeTruthy());
        await waitFor(() => expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(''));

        await user.type(screen.getByLabelText('Password'), 'new-secret');
        await user.click(screen.getByRole('button', { name: 'Log in' }));

        expect(visits).toHaveLength(2);
        visits[1].options.onFinish?.({} as never);
    });

    it('does not turn successful navigation into cancellation and clears the password', async () => {
        const user = userEvent.setup();
        renderLogin();
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));

        let cancelCount = 0;
        visits[0].options.onCancelToken?.({ cancel: () => { cancelCount += 1; } });
        visits[0].options.onStart?.({} as never);
        visits[0].options.onSuccess?.(page('Student/Dashboard', 42));
        visits[0].options.onFinish?.({} as never);

        expect(cancelCount).toBe(0);
        await waitFor(() => expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(''));
    });

    it('ignores stale callbacks from a prior submission after a fresh submission starts', async () => {
        const user = userEvent.setup();
        renderLogin();
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));
        const first = visits[0].options;
        first.onStart?.({} as never);
        first.onError?.({ email: 'Invalid credentials' });

        await user.type(screen.getByLabelText('Password'), 'fresh-secret');
        await user.click(screen.getByRole('button', { name: 'Log in' }));
        const second = visits[1].options;
        second.onStart?.({} as never);
        first.onSuccess?.(page('Student/Dashboard', 99));

        expect(screen.queryByText('Your account requires verification before you can continue.')).toBeNull();
        expect(visits).toHaveLength(2);
        second.onError?.({ email: 'Invalid credentials' });
    });

    it('keeps transport classification alive when the view detaches before success', async () => {
        const user = userEvent.setup();
        const registry = new OperationRegistry();
        const { unmount } = render(
            <Login integration="urlm" adapterRegistry={registry} />,
        );
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));
        const options = visits[0].options;
        options.onStart?.({} as never);
        options.onCancelToken?.({ cancel: () => { throw new Error('successful navigation was cancelled'); } });
        unmount();

        options.onSuccess?.(page('Student/Dashboard', 42));
        options.onFinish?.({} as never);

        expect(registry.activeRecordCount()).toBe(0);
        expect(registry.terminalSnapshotCount()).toBe(1);
    });

    it('keeps one transport owner through StrictMode effect probing', async () => {
        const user = userEvent.setup();
        render(
            <StrictMode>
                <Login integration="urlm" adapterRegistry={new OperationRegistry()} />
            </StrictMode>,
        );
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));

        expect(visits).toHaveLength(1);
        visits[0].options.onError?.({ email: 'Invalid credentials' });
        visits[0].options.onFinish?.({} as never);
    });

    it('preserves a no-finish unknown outcome with explicit GET recovery', async () => {
        const user = userEvent.setup();
        renderLogin();
        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Log in' }));
        visits[0].options.onStart?.({} as never);
        visits[0].options.onFinish?.({} as never);

        const recovery = await waitFor(() =>
            screen.getByRole('link', { name: 'Refresh sign-in page' }),
        );
        expect(recovery.getAttribute('href')).toBe('/login');
        expect(visits).toHaveLength(1);
    });
});
