// resources/js/Pages/Auth/ForgotPassword.tsx — REPLACE EXISTING FILE

import { FormEventHandler } from 'react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackToHome } from '@/components/auth/BackToHome';

interface Props { status?: string; }

export default function ForgotPassword({ status }: Props) {
  const { data, setData, post, processing, errors } = useForm({ email: '' });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('password.email'));
  };

  return (
    <GuestLayout>
      <Head title="Forgot Password – Housing@UMU" />

      <div className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Forgot your password? No problem. Enter your email address and we'll
        send you a reset link so you can choose a new one.
      </div>

      {status && (
        <div className="mb-4 text-sm font-medium text-emerald-600 bg-emerald-50
                        border border-emerald-200 p-3 rounded-md">
          {status}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={data.email}
            autoFocus
            onChange={(e) => setData('email', e.target.value)}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            required
          />
          {errors.email && (
            <p className="text-xs font-semibold text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href={route('login')}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors font-medium order-2 sm:order-1"
          >
            Back to sign in
          </Link>
          <Button
            type="submit"
            className="w-full sm:w-auto font-medium bg-brand-700 hover:bg-brand-800 text-white order-1 sm:order-2"
            disabled={processing}
          >
            {processing ? 'Sending Link…' : 'Email Password Reset Link'}
          </Button>
        </div>
      </form>

      <BackToHome />
    </GuestLayout>
  );
}
