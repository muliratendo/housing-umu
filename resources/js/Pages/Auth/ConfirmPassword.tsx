// resources/js/Pages/Auth/ConfirmPassword.tsx — REPLACE EXISTING FILE

import { useEffect, FormEventHandler } from 'react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';

export default function ConfirmPassword() {
  const { data, setData, post, processing, errors, reset } = useForm({
    password: '',
  });

  useEffect(() => () => { reset('password'); }, []);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('password.confirm'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <GuestLayout>
      <Head title="Confirm Password – Housing@UMU" />

      <div className="mb-4 text-sm text-muted-foreground leading-relaxed">
        This is a secure area of the application. Please confirm your password
        before continuing.
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={data.password}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setData('password', e.target.value)}
            hasError={!!errors.password}
            required
          />
          {errors.password && (
            <p className="text-xs font-semibold text-destructive">{errors.password}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full font-medium bg-brand-700 hover:bg-brand-800 text-white"
            disabled={processing}
          >
            {processing ? 'Confirming…' : 'Confirm Password'}
          </Button>
        </div>
      </form>

      <BackToHome />
    </GuestLayout>
  );
}
