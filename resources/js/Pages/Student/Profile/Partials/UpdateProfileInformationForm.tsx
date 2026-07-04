// File: resources/js/Pages/Profile/Partials/UpdateProfileInformationForm.tsx
import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { CheckCircle2, Loader2, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Alert, AlertDescription,
} from '@/components/ui/alert';

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  name: string;
  email: string;
  email_verified_at: string | null;
}

interface Props {
  mustVerifyEmail: boolean;
  status?: string;
  className?: string;
}

interface ProfileFormData {
  name: string;
  email: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpdateProfileInformationForm({
  mustVerifyEmail,
  status,
  className = '',
}: Props) {
  const user = usePage<{ auth: { user: User } }>().props.auth.user;

  const { data, setData, patch, errors, processing, recentlySuccessful } =
    useForm<ProfileFormData>({
      name: user.name,
      email: user.email,
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    patch(route('profile.update'));
  };

  return (
    <Card className={`rounded-xl border shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-base font-semibold font-heading">
          Profile Information
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Update your name and email address. If you change your email, a new
          verification link will be sent.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                className="pl-9"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                required
                autoComplete="name"
                placeholder="Your full name"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-9"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                required
                autoComplete="username"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Email verification notice */}
          {mustVerifyEmail && user.email_verified_at === null && (
            <Alert>
              <Mail className="size-4" />
              <AlertDescription className="text-sm">
                Your email address is unverified.{' '}
                <Link
                  href={route('verification.send')}
                  method="post"
                  as="button"
                  className="underline underline-offset-2 text-brand-700 hover:text-brand-800 font-medium"
                >
                  Click here to resend the verification email.
                </Link>
                {status === 'verification-link-sent' && (
                  <span className="ml-2 text-brand-700 font-medium">
                    A new verification link has been sent.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={processing}
              className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
              title="Save profile changes"
            >
              {processing && <Loader2 className="size-4 mr-2 animate-spin" />}
              {processing ? 'Saving...' : 'Save Changes'}
            </Button>

            {recentlySuccessful && (
              <span className="flex items-center gap-1.5 text-sm text-brand-700 font-medium">
                <CheckCircle2 className="size-4" />
                Saved
              </span>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
