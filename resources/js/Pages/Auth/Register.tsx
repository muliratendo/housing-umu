/**
 * FILE: resources/js/Pages/Auth/Register.tsx
 *
 * FIX (2026-09-12): applies the same stale-error-clearing pattern as
 * Login.tsx. Every field edit now clears that specific field's Laravel
 * validation error via `clearErrors(field)` in addition to the local
 * `useFormGuard` state, so a corrected email/name/password no longer sits
 * next to a message describing the PREVIOUS submitted value.
 * =============================================================================
 */
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
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

type RegisterField = 'name' | 'email' | 'password' | 'password_confirmation';

export default function Register() {
  const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const guard = useFormGuard(
    { name: '', email: '', password: '', password_confirmation: '' },
    {
      name: {
        required: true,
        maxLength: 255,
      },
      email: {
        required: true,
        validate: (value) =>
          /^\S+@\S+\.\S+$/.test(value) ? null : 'Enter a valid email address.',
      },
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
  const hasServerError = submitted && Object.keys(errors).length > 0;
  const classified = classifyError({ status: 422 });
  const checklist = useMemo(() => passwordChecklist(data.password), [data.password]);

  useEffect(() => {
    return () => {
      reset('password', 'password_confirmation');
    };
  }, [reset]);

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('register'), {
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
    component: 'auth.register.submit',
    userFlow: 'guest',
    action: submitRequest,
  });

  /**
   * FIX: clears the specific field's stale Laravel error on every edit, the
   * same pattern used on Login.tsx, so a corrected value is never shown
   * beside a message that describes an earlier, already-fixed value.
   */
  const updateField = (field: RegisterField, value: string) => {
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
      <Head title="Create account" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Start your Housing@UMU accommodation journey.
          </p>
        </div>

        {hasServerError && (
          <ErrorState
            component="auth.register.form"
            userFlow="guest"
            reasonCode={classified.reasonCode}
            userMessage="A few details need fixing before your account can be created. Check the highlighted fields."
            placement={classified.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.register.submit"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="Creating your account is taking longer than usual. Please keep this page open while we finish."
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
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={data.name}
              onChange={(event) => updateField('name', event.target.value)}
              onBlur={() => guard.onBlur('name')}
              aria-invalid={Boolean(guard.errors.name || errors.name)}
              className={guard.errors.name || errors.name ? 'ux-field-invalid' : ''}
            />
            {guard.touched.name && guard.errors.name && (
              <p className="ux-inline-error">{guard.errors.name}</p>
            )}
          </div>

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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={data.password}
              onChange={(event) => updateField('password', event.target.value)}
              onBlur={() => guard.onBlur('password')}
              hasError={Boolean(guard.errors.password || errors.password)}
            />
            <p className="text-xs text-muted-foreground">
              Use 8+ characters with uppercase, lowercase, and a number.
            </p>
            <p className="text-xs text-muted-foreground">
              {isPasswordStrongEnough
                ? 'Password requirements met.'
                : 'Password requirements are not met yet.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm password</Label>
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
              Complete the highlighted details before creating your account.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isBusy || !guard.isValid}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Creating account"
                />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href={route('login')} className="underline">
            Log in
          </Link>
        </p>
      </div>
    </GuestLayout>
  );
}
