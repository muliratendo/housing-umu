// resources/js/Pages/Auth/VerifyEmail.tsx — REPLACE EXISTING FILE

import { FormEventHandler } from 'react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { BackToHome } from '@/components/auth/BackToHome';

interface Props { status?: string; }

export default function VerifyEmail({ status }: Props) {
  const { post, processing } = useForm({});

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('verification.send'));
  };

  return (
    <GuestLayout>
      <Head title="Verify Email – Housing@UMU" />

      <div className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Thanks for signing up! Before getting started, please verify your email
        address by clicking the link we sent you. If you didn't receive it, we
        can send another.
      </div>

      {status === 'verification-link-sent' && (
        <div className="mb-4 text-sm font-medium text-emerald-600 bg-emerald-50
                        border border-emerald-200 p-3 rounded-md">
          A new verification link has been sent to your email address.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            type="submit"
            className="w-full sm:w-auto font-medium bg-brand-700 hover:bg-brand-800 text-white"
            disabled={processing}
          >
            {processing ? 'Sending…' : 'Resend Verification Email'}
          </Button>

          <Link
            href={route('logout')}
            method="post"
            as="button"
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors font-medium"
          >
            Log Out
          </Link>
        </div>
      </form>

      <BackToHome />
    </GuestLayout>
  );
}
