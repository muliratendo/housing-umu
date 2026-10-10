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
import { FormEventHandler, useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
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

interface Props {
  status?: string;
  canResetPassword?: boolean;
}

type LoginField = 'email' | 'password';

export default function Login({ status, canResetPassword = false }: Props) {
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
  const validationError = classifyError({ status: 422 });

  // FIX: a throttle/lockout message must survive keystrokes — Laravel is the
  // sole authority on whether the wait has actually expired. We detect it by
  // message content because `LoginRequest::authenticate()` currently returns
  // both the generic credential failure and the throttle message under the
  // same `email` key (see server-side note in CHANGELOG.md).
  const isThrottleMessage = (message?: string) =>
    Boolean(message) && /wait|attempt|seconds|minute/i.test(message as string);

  const hasCredentialError = submitted && Boolean(errors.email || errors.password);
  const isThrottled = isThrottleMessage(errors.email);

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

    if (guard.isValid) {
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

    if (errors[field] && !(field === 'email' && isThrottleMessage(errors.email))) {
      clearErrors(field);
    }
  };

  const isBusy = processing || silentFailure.isRunning;

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
            reasonCode={isThrottled ? 'RATE_LIMITED' : validationError.reasonCode}
            userMessage={
              isThrottled
                ? (errors.email as string)
                : 'We could not sign you in with those details. Check your email and password, then try again.'
            }
            placement={isThrottled ? 'toast' : validationError.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
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

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">University email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(event) => updateField('email', event.target.value)}
              onBlur={() => guard.onBlur('email')}
              aria-invalid={Boolean(guard.errors.email || errors.email)}
              className={guard.errors.email || errors.email ? 'ux-field-invalid' : ''}
            />
            {guard.touched.email && guard.errors.email && (
              <p className="ux-inline-error">{guard.errors.email}</p>
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
              hasError={Boolean(guard.errors.password || errors.password)}
            />
            {guard.touched.password && guard.errors.password && (
              <p className="ux-inline-error">{guard.errors.password}</p>
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

          <Button type="submit" className="w-full" disabled={isBusy || !guard.isValid}>
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
