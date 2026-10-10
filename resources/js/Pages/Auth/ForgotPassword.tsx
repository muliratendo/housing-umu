/**
 * FILE: resources/js/Pages/Auth/ForgotPassword.tsx
 *
 * FIX (2026-09-12): clears the stale email-format error on edit and gives
 * the "taking longer than usual" warning proper attempt identity via the
 * patched StaleFailureGuard hook.
 * =============================================================================
 */
import { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackToHome } from '@/components/auth/BackToHome';
import { ErrorState } from '@/components/states/ErrorState';
import { SuccessState } from '@/components/states/SuccessState';
import { LoadingIndicator } from '@/components/states/LoadingIndicator';
import { classifyError } from '@/lib/classifyError';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useSilentFailureGuard } from '@/components/states/StaleFailureGuard';

interface Props {
  status?: string;
}

export default function ForgotPassword({ status }: Props) {
  const { data, setData, post, processing, errors, clearErrors } = useForm({
    email: '',
  });

  const guard = useFormGuard(
    { email: '' },
    {
      email: {
        required: true,
        validate: (value) =>
          /^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email address.',
      },
    },
  );

  const [submitted, setSubmitted] = useState(false);
  const classified = classifyError({ status: 422 });

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('password.email'), {
        onSuccess: () => {
          resolve();
        },
        onError: () => {
          reject({ status: 422 });
        },
      });
    });

  const silentFailure = useSilentFailureGuard({
    component: 'auth.forgot_password.submit',
    userFlow: 'guest',
    action: submitRequest,
  });

  const updateEmail = (value: string) => {
    guard.setValue('email', value);
    setData('email', value);

    if (errors.email) {
      clearErrors('email');
    }
  };

  const submit: FormEventHandler = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (guard.isValid) {
      silentFailure.run();
    }
  };

  const isBusy = processing || silentFailure.isRunning;

  return (
    <GuestLayout>
      <Head title="Forgot password" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send a reset link if an account exists.
          </p>
        </div>

        {status && (
          <SuccessState
            component="auth.forgot_password.status"
            userFlow="guest"
            reasonCode="RESET_LINK_SENT"
            tier="toast"
            message="If that email belongs to an account, a password reset link has been sent."
          />
        )}

        {submitted && Boolean(errors.email) && (
          <ErrorState
            component="auth.forgot_password.form"
            userFlow="guest"
            reasonCode={classified.reasonCode}
            userMessage="Check the email address and try again."
            placement={classified.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.forgot_password.submit"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="Sending the reset link is taking longer than usual. Please keep this page open while we finish."
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
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(event) => updateEmail(event.target.value)}
              onBlur={() => guard.onBlur('email')}
              aria-invalid={Boolean(guard.errors.email || errors.email)}
              className={guard.errors.email || errors.email ? 'ux-field-invalid' : ''}
            />
            {guard.touched.email && guard.errors.email && (
              <p className="ux-inline-error">{guard.errors.email}</p>
            )}
          </div>

          {submitted && !guard.isValid && (
            <p className="ux-inline-error">Enter your email address before continuing.</p>
          )}

          <Button type="submit" className="w-full" disabled={isBusy || !guard.isValid}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Sending reset link"
                />
                Sending link…
              </>
            ) : (
              'Email password reset link'
            )}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link className="underline" href={route('login')}>
            Back to log in
          </Link>
        </p>
      </div>
    </GuestLayout>
  );
}
