// resources/js/Pages/Auth/ResetPassword.tsx — REPLACE EXISTING FILE

import { useEffect, FormEventHandler } from 'react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';

interface Props { token: string; email: string; }

export default function ResetPassword({ token, email }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  useEffect(() => () => { reset('password', 'password_confirmation'); }, []);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('password.store'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <GuestLayout>
      <Head title="Reset Password – Housing@UMU" />

      <form onSubmit={submit} className="space-y-4">
        <input type="hidden" name="token" value={data.token} />

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={data.email}
            autoComplete="username"
            onChange={(e) => setData('email', e.target.value)}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            required
          />
          {errors.email && (
            <p className="text-xs font-semibold text-destructive">{errors.email}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={data.password}
            autoComplete="new-password"
            autoFocus
            onChange={(e) => setData('password', e.target.value)}
            hasError={!!errors.password}
            required
          />
          {errors.password && (
            <p className="text-xs font-semibold text-destructive">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation">Confirm New Password</Label>
          <PasswordInput
            id="password_confirmation"
            name="password_confirmation"
            value={data.password_confirmation}
            autoComplete="new-password"
            onChange={(e) => setData('password_confirmation', e.target.value)}
            hasError={!!errors.password_confirmation}
            required
          />
          {errors.password_confirmation && (
            <p className="text-xs font-semibold text-destructive">{errors.password_confirmation}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full font-medium bg-brand-700 hover:bg-brand-800 text-white"
            disabled={processing}
          >
            {processing ? 'Updating Password…' : 'Reset Password'}
          </Button>
        </div>
      </form>

      <BackToHome />
    </GuestLayout>
  );
}
