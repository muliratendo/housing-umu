/**
 * FILE: resources/js/Pages/Auth/VerifyEmail.tsx
 *
 * FIX (2026-09-12): the resend action now uses the attempt-aware
 * StaleFailureGuard so a slow resend cannot show a stale "taking longer"
 * warning after a later resend attempt has already completed.
 * =============================================================================
 */
import { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { BackToHome } from '@/components/auth/BackToHome';
import { ErrorState } from '@/components/states/ErrorState';
import { SuccessState } from '@/components/states/SuccessState';
import { LoadingIndicator } from '@/components/states/LoadingIndicator';
import { classifyError } from '@/lib/classifyError';
import { useSilentFailureGuard } from '@/components/states/StaleFailureGuard';

interface Props {
  status?: string;
}

export default function VerifyEmail({ status }: Props) {
  const { post, processing, errors } = useForm({});
  const [submitted, setSubmitted] = useState(false);
  const classified = classifyError({ status: 429 });

  const submitRequest = () =>
    new Promise<void>((resolve, reject) => {
      post(route('verification.send'), {
        onSuccess: () => {
          resolve();
        },
        onError: () => {
          reject({ status: 429 });
        },
      });
    });

  const silentFailure = useSilentFailureGuard({
    component: 'auth.verify_email.resend',
    userFlow: 'guest',
    action: submitRequest,
  });

  const submit: FormEventHandler = (event) => {
    event.preventDefault();
    setSubmitted(true);
    silentFailure.run();
  };

  const isBusy = processing || silentFailure.isRunning;

  return (
    <GuestLayout>
      <Head title="Verify email" />
      <div className="space-y-6">
        <BackToHome />

        <div>
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link when you created your account. Open it to continue to
            Housing@UMU.
          </p>
        </div>

        {status === 'verification-link-sent' && (
          <SuccessState
            component="auth.verify_email.status"
            userFlow="guest"
            reasonCode="VERIFICATION_LINK_SENT"
            tier="toast"
            message="A fresh verification link has been sent to your email address."
          />
        )}

        {submitted && Object.keys(errors).length > 0 && (
          <ErrorState
            component="auth.verify_email.resend"
            userFlow="guest"
            reasonCode={classified.reasonCode}
            userMessage="We could not send another link just yet. Please wait a moment, then try again."
            placement={classified.placement}
          />
        )}

        {silentFailure.suspectedSilentFailure && (
          <ErrorState
            component="auth.verify_email.resend"
            userFlow="guest"
            reasonCode="WATCHDOG_TIMEOUT"
            userMessage="Sending the verification email is taking longer than usual. Please keep this page open while we finish."
            placement="inline"
            primaryAction={
              !isBusy
                ? { label: 'Try again', onClick: silentFailure.resubmit }
                : undefined
            }
          />
        )}

        <form onSubmit={submit}>
          <Button type="submit" className="w-full" disabled={isBusy}>
            {isBusy ? (
              <>
                <LoadingIndicator
                  startedAt={Date.now() - 400}
                  preferredVariant="inline-spinner"
                  label="Sending verification email"
                />
                Sending verification link…
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>
        </form>

        <p className="text-center text-sm">
          Wrong account?{' '}
          <Link className="underline" href={route('logout')} method="post" as="button">
            Log out
          </Link>
        </p>
      </div>
    </GuestLayout>
  );
}
