/**
 * FILE: resources/js/Pages/Auth/Login.tsx
 *
 * FIX (2026-09-12): stale-state bugs found after the first UX-system rollout.
 *
 * BUG 1 — old Laravel validation errors survived corrected input.
 *   `errors.email` / `errors.password` come from Inertia's `useForm`, not
 *   from `useFormGuard`. The previous version only updated `useFormGuard`'s
 *   local validation state on change and never called Inertia's own
 *   `clearErrors()`, so a stale "these credentials are incorrect" message
 *   stayed on screen even after the user retyped a valid email/password.
 *   FIX: `updateField()` below calls `clearErrors(field)` on every edit,
 *   except for throttle/lockout messages, which must remain visible until a
 *   new submission — Laravel is the sole authority on when a rate limit has
 *   actually expired, so typing must not silently hide it.
 *
 * BUG 2 — the "taking longer than expected" warning had no attempt identity.
 *   Fixed at the shared-hook level in StaleFailureGuard.tsx (see that file's
 *   2026-09-12 changelog). This page also stops implying a retry is always
 *   safe: the submit button remains disabled for the entire lifetime of the
 *   current attempt, and the retry action only appears once that attempt has
 *   genuinely finished.
 * =============================================================================
 */
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingIndicator } from '@/components/states/LoadingIndicator';
import { SuccessState } from '@/components/states/SuccessState';
import { classifyError } from '@/lib/classifyError';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useSilentFailureGuard } from '@/components/states/StaleFailureGuard';
import { createLoginAdapter, type LoginAdapter } from '@/lib/urlm/adapters/loginAdapter';
import type { OperationRegistry } from '@/lib/urlm/coordinator/OperationRegistry';

interface Props {
  status?: string;
  canResetPassword?: boolean;
  integration?: 'legacy' | 'urlm';
  adapterRegistry?: OperationRegistry;
}

type LoginField = 'email' | 'password';

export default function Login({
  status,
  canResetPassword = false,
  integration = 'legacy',
  adapterRegistry,
}: Props) {
  const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const guard = useFormGuard(
    { email: '', password: '' },
    {
      email: {
        required: true,
        validate: (value) =>
          /^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email address.',
      },
      password: {
        required: true,
      },
    },
  );

  const [submitted, setSubmitted] = useState(false);
  const [editedFields, setEditedFields] = useState<Set<LoginField>>(new Set());
  const [urlmBlocked, setUrlmBlocked] = useState(false);
  const isUrlmIntegration = integration === 'urlm';
  const validationError = classifyError({ status: 422 });
  const loginAdapter = useMemo<LoginAdapter | undefined>(
    () => isUrlmIntegration
      ? createLoginAdapter((url, options) => router.visit(url, options), adapterRegistry)
      : undefined,
    [adapterRegistry, isUrlmIntegration],
  );
  const [adapterState, setAdapterState] = useState(() => loginAdapter?.getState());

  // FIX: a throttle/lockout message must survive keystrokes — Laravel is the
  // sole authority on whether the wait has actually expired. We detect it by
  // message content because `LoginRequest::authenticate()` currently returns
  // both the generic credential failure and the throttle message under the
  // same `email` key (see server-side note in CHANGELOG.md).
  const isThrottleMessage = (message?: string) =>
    Boolean(message) && /wait|attempt|seconds|minute/i.test(message as string);

  const isThrottled = isThrottleMessage(errors.email);

  useEffect(() => {
    if (!loginAdapter) return;
    const unsubscribe = loginAdapter.subscribe(setAdapterState);
    return () => {
      unsubscribe();
      loginAdapter.detachView();
    };
  }, [loginAdapter]);

  useEffect(() => {
    if (isUrlmIntegration &&
      ['validation_failed', 'succeeded', 'auth_required', 'awaiting_outcome', 'abandoned']
        .includes(adapterState?.status ?? '')) {
      reset('password');
    }
  }, [adapterState?.status, isUrlmIntegration, reset]);

  useEffect(() => {
    if (adapterState?.status === 'validation_failed') {
      setEditedFields(new Set());
    }
  }, [adapterState?.status]);

  useEffect(() => {
    return () => {
      reset('password');
    };
  }, [reset]);

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('login'), {
        onSuccess: () => {
          resolve();
        },
        onError: () => {
          reject({ status: 422 });
        },
        onFinish: () => {
          reset('password');
        },
      });
    });

  const silentFailure = useSilentFailureGuard({
    component: 'auth.login.submit',
    userFlow: 'guest',
    action: submitRequest,
  });

  const submit: FormEventHandler = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!guard.isValid) return;

    if (isUrlmIntegration) {
      if (!loginAdapter) return;
      const result = loginAdapter.start(data.email, data.password, data.remember);
      setUrlmBlocked(result.kind === 'blocked' || result.kind === 'queued' || result.kind === 'already_owner');
    } else {
      silentFailure.run();
    }
  };

  /**
   * FIX: clears the SPECIFIC field's stale Laravel error the moment the user
   * edits it, in addition to updating the local useFormGuard validation
   * state. A throttle/lockout message is left in place on purpose — only a
   * fresh submission attempt should be able to remove it.
   */
  const updateField = (field: LoginField, value: string) => {
    guard.setValue(field, value);
    setData(field, value);
    setEditedFields((current) => new Set(current).add(field));

    if (!isUrlmIntegration && errors[field] &&
      !(field === 'email' && isThrottleMessage(errors.email))) {
      clearErrors(field);
    }
  };

  const urlmFieldErrors = adapterState?.status === 'validation_failed'
    ? Object.fromEntries(
      Object.entries(adapterState.fieldErrors)
        .filter(([field]) => !editedFields.has(field as LoginField)),
    )
    : {};
  const fieldErrors = isUrlmIntegration ? urlmFieldErrors : errors;
  const hasCredentialError = submitted && Boolean(fieldErrors.email || fieldErrors.password);
  const urlmPending = isUrlmIntegration &&
    (adapterState?.status === 'validating' || adapterState?.status === 'submitting');
  const urlmUnknown = isUrlmIntegration &&
    (adapterState?.status === 'awaiting_outcome' || adapterState?.status === 'reconciling');
  const isBusy = isUrlmIntegration ? urlmPending : processing || silentFailure.isRunning;
  const urlmRecoveryRequired = urlmUnknown || urlmBlocked;
  const emailServerError = Array.isArray(fieldErrors.email)
    ? fieldErrors.email[0]
    : fieldErrors.email;
  const passwordServerError = Array.isArray(fieldErrors.password)
    ? fieldErrors.password[0]
    : fieldErrors.password;

  return (
    <GuestLayout>
      <Head title="Log in" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Log in to manage your Housing@UMU accommodation.
          </p>
        </div>

        {status && (
          <SuccessState
            component="auth.login.status"
            userFlow="guest"
            reasonCode="AUTH_STATUS"
            tier="toast"
            message={status}
          />
        )}

        {hasCredentialError && (
          <ErrorState
            component="auth.login.credentials"
            userFlow="guest"
            reasonCode={!isUrlmIntegration && isThrottled ? 'RATE_LIMITED' : validationError.reasonCode}
            userMessage={
              !isUrlmIntegration && isThrottled
                ? (errors.email as string)
                : 'We could not sign you in with those details. Check your email and password, then try again.'
            }
            placement={!isUrlmIntegration && isThrottled ? 'toast' : validationError.placement}
          />
        )}

        {isUrlmIntegration && urlmRecoveryRequired && (
          <ErrorState
            component="auth.login.recovery"
            userFlow="guest"
            reasonCode="OUTCOME_REQUIRED"
            userMessage="We could not confirm the sign-in result. Refresh the sign-in page before trying again."
            placement="inline"
            primaryAction={{ label: 'Refresh sign-in page', href: route('login') }}
          />
        )}

        {isUrlmIntegration && adapterState?.status === 'auth_required' && (
          <ErrorState
            component="auth.login.verification"
            userFlow="guest"
            reasonCode="AUTH_REQUIRED"
            userMessage="Your account requires verification before you can continue. Follow the server-provided verification flow."
            placement="inline"
          />
        )}

        {!isUrlmIntegration && silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.login.submit"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="Signing you in is taking longer than usual. Please keep this page open while we finish checking your account."
            placement="inline"
            primaryAction={
              !isBusy
                ? { label: 'Try again', onClick: silentFailure.resubmit }
                : undefined
            }
          />
        )}

        <form
          onSubmit={submit}
          className="space-y-4"
          noValidate
          aria-label="Sign in form"
          aria-busy={isBusy}
        >
          <div className="space-y-2">
            <Label htmlFor="email">University email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(event) => updateField('email', event.target.value)}
              onBlur={() => guard.onBlur('email')}
              aria-invalid={Boolean(guard.errors.email || emailServerError)}
              className={guard.errors.email || emailServerError ? 'ux-field-invalid' : ''}
            />
            {guard.touched.email && guard.errors.email && (
              <p className="ux-inline-error">{guard.errors.email}</p>
            )}
            {emailServerError && (
              <p className="ux-inline-error">{emailServerError}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {canResetPassword && (
                <Link className="text-sm underline" href={route('password.request')}>
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={data.password}
              onChange={(event) => updateField('password', event.target.value)}
              onBlur={() => guard.onBlur('password')}
              hasError={Boolean(guard.errors.password || passwordServerError)}
            />
            {guard.touched.password && guard.errors.password && (
              <p className="ux-inline-error">{guard.errors.password}</p>
            )}
            {passwordServerError && (
              <p className="ux-inline-error">{passwordServerError}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.remember}
              onCheckedChange={(checked) => setData('remember', checked === true)}
            />
            Keep me signed in on this device
          </label>

          {submitted && !guard.isValid && (
            <p className="ux-inline-error">
              Complete your email and password before logging in.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isBusy || urlmRecoveryRequired || !guard.isValid}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Logging in"
                />
                Logging in…
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </form>

        <p className="text-center text-sm">
          New to Housing@UMU?{' '}
          <Link className="underline" href={route('register')}>
            Create an account
          </Link>
        </p>
      </div>
    </GuestLayout>
  );
}
