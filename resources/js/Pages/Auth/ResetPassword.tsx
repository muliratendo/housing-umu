/**
 * FILE: resources/js/Pages/Auth/ResetPassword.tsx
 *
 * FIX (2026-09-12): clears stale password/confirmation errors on edit. The
 * reset token continues to be passed only as a hidden form value and is
 * never logged or rendered as visible text.
 * =============================================================================
 */
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingIndicator } from '@/components/states/LoadingIndicator';
import { classifyError } from '@/lib/classifyError';
import { passwordChecklist, useFormGuard } from '@/hooks/useFormGuard';
import { useSilentFailureGuard } from '@/components/states/StaleFailureGuard';

interface Props {
  token: string;
  email: string;
}

type ResetField = 'password' | 'password_confirmation';

export default function ResetPassword({ token, email }: Props) {
  const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  const guard = useFormGuard(
    { password: '', password_confirmation: '' },
    {
      password: {
        required: true,
        validate: (value) => {
          const checklist = passwordChecklist(value);
          const isStrongEnough =
            checklist.minLength && checklist.hasUpper && checklist.hasLower && checklist.hasNumber;
          return isStrongEnough ? null : 'Use a stronger password.';
        },
      },
      password_confirmation: {
        required: true,
        validate: (value) => (value === data.password ? null : 'Passwords do not match.'),
      },
    },
  );

  const [submitted, setSubmitted] = useState(false);
  const classified = classifyError({ status: 422 });
  const checklist = useMemo(() => passwordChecklist(data.password), [data.password]);

  useEffect(() => {
    return () => {
      reset('password', 'password_confirmation');
    };
  }, [reset]);

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('password.store'), {
        onSuccess: () => {
          resolve();
        },
        onError: () => {
          reject({ status: 422 });
        },
        onFinish: () => {
          reset('password', 'password_confirmation');
        },
      });
    });

  const silentFailure = useSilentFailureGuard({
    component: 'auth.reset_password.submit',
    userFlow: 'guest',
    action: submitRequest,
  });

  const updateField = (field: ResetField, value: string) => {
    guard.setValue(field, value);
    setData(field, value);

    if (errors[field]) {
      clearErrors(field);
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
  const isPasswordStrongEnough =
    checklist.minLength && checklist.hasUpper && checklist.hasLower && checklist.hasNumber;

  return (
    <GuestLayout>
      <Head title="Reset password" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            Create a password you have not used before.
          </p>
        </div>

        {submitted && Object.keys(errors).length > 0 && (
          <ErrorState
            component="auth.reset_password.form"
            userFlow="guest"
            reasonCode={classified.reasonCode}
            userMessage="A few details need fixing before your password can be reset."
            placement={classified.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.reset_password.submit"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="Resetting your password is taking longer than usual. Please keep this page open while we finish."
            placement="inline"
            primaryAction={
              !isBusy
                ? { label: 'Try again', onClick: silentFailure.resubmit }
                : undefined
            }
          />
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <input type="hidden" value={data.token} readOnly />

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={data.email} readOnly aria-readonly="true" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={data.password}
              onChange={(event) => updateField('password', event.target.value)}
              onBlur={() => guard.onBlur('password')}
              hasError={Boolean(guard.errors.password || errors.password)}
            />
            <p className="text-xs text-muted-foreground">
              {isPasswordStrongEnough
                ? 'Password requirements met.'
                : 'Use 8+ characters with uppercase, lowercase, and a number.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm new password</Label>
            <PasswordInput
              id="password_confirmation"
              autoComplete="new-password"
              value={data.password_confirmation}
              onChange={(event) => updateField('password_confirmation', event.target.value)}
              onBlur={() => guard.onBlur('password_confirmation')}
              hasError={Boolean(
                guard.errors.password_confirmation || errors.password_confirmation,
              )}
            />
            {guard.touched.password_confirmation && guard.errors.password_confirmation && (
              <p className="ux-inline-error">{guard.errors.password_confirmation}</p>
            )}
          </div>

          {submitted && !guard.isValid && (
            <p className="ux-inline-error">
              Complete the highlighted details before continuing.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isBusy || !guard.isValid}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Resetting password"
                />
                Resetting password…
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>
      </div>
    </GuestLayout>
  );
}
