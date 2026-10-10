/**
 * FILE: resources/js/Pages/Auth/ConfirmPassword.tsx
 *
 * FIX (2026-09-12): clears the stale "password confirmation failed" error on
 * edit, and disables retry while the current attempt might still land.
 * =============================================================================
 */
import { FormEventHandler, useEffect, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingIndicator } from '@/components/states/LoadingIndicator';
import { classifyError } from '@/lib/classifyError';
import { useFormGuard } from '@/hooks/useFormGuard';
import { useSilentFailureGuard } from '@/components/states/StaleFailureGuard';

export default function ConfirmPassword() {
  const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
    password: '',
  });

  const guard = useFormGuard(
    { password: '' },
    {
      password: {
        required: true,
      },
    },
  );

  const [submitted, setSubmitted] = useState(false);
  const classified = classifyError({ status: 422 });

  useEffect(() => {
    return () => {
      reset('password');
    };
  }, [reset]);

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('password.confirm'), {
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
    component: 'auth.confirm_password.submit',
    userFlow: 'guest',
    action: submitRequest,
  });

  const updatePassword = (value: string) => {
    guard.setValue('password', value);
    setData('password', value);

    if (errors.password) {
      clearErrors('password');
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
      <Head title="Confirm password" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Confirm your password</h1>
          <p className="text-sm text-muted-foreground">
            For your security, enter your password before continuing.
          </p>
        </div>

        {submitted && Boolean(errors.password) && (
          <ErrorState
            component="auth.confirm_password.form"
            userFlow="guest"
            reasonCode={classified.reasonCode}
            userMessage="That password could not be confirmed. Check it and try again."
            placement={classified.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.confirm_password.submit"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="This security check is taking longer than usual. Please keep this page open while we finish."
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={data.password}
              onChange={(event) => updatePassword(event.target.value)}
              onBlur={() => guard.onBlur('password')}
              hasError={Boolean(guard.errors.password || errors.password)}
            />
            {guard.touched.password && guard.errors.password && (
              <p className="ux-inline-error">{guard.errors.password}</p>
            )}
          </div>

          {submitted && !guard.isValid && (
            <p className="ux-inline-error">Enter your password before continuing.</p>
          )}

          <Button type="submit" className="w-full" disabled={isBusy || !guard.isValid}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Confirming password"
                />
                Confirming…
              </>
            ) : (
              'Confirm password'
            )}
          </Button>
        </form>
      </div>
    </GuestLayout>
  );
}
