// resources/js/Pages/Auth/Register.tsx — REPLACE EXISTING FILE

import { useEffect, FormEventHandler } from 'react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BackToHome } from '@/components/auth/BackToHome';

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => () => { reset('password', 'password_confirmation'); }, []);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('register'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <GuestLayout>
      <Head title="Register – Housing@UMU" />

      <form onSubmit={submit} className="space-y-4">

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            value={data.name}
            autoComplete="name"
            autoFocus
            onChange={(e) => setData('name', e.target.value)}
            className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
            required
          />
          {errors.name && (
            <p className="text-xs font-semibold text-destructive">{errors.name}</p>
          )}
        </div>

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

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={data.password}
            autoComplete="new-password"
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
          <Label htmlFor="password_confirmation">Confirm Password</Label>
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

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            className="w-full font-medium bg-brand-700 hover:bg-brand-800 text-white"
            disabled={processing}
          >
            {processing ? 'Creating Account…' : 'Register'}
          </Button>

          <div className="text-center">
            <Link
              href={route('login')}
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors font-medium"
            >
              Already registered? Sign In
            </Link>
          </div>
        </div>

      </form>

      <BackToHome />
    </GuestLayout>
  );
}
