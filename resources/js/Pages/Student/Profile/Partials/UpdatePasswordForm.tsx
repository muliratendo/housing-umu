// File: resources/js/Pages/Profile/Partials/UpdatePasswordForm.tsx
import React, { useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

interface PasswordFormData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// ── Password field with visibility toggle ─────────────────────────────────────

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        className="pl-9 pr-10"
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        title={visible ? 'Hide password' : 'Show password'}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible
          ? <EyeOff className="size-4" />
          : <Eye className="size-4" />}
      </button>
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────────────────────

function strengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'] as const;
const STRENGTH_COLORS = [
  '',
  'bg-destructive',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-brand-700',
  'bg-green-600',
] as const;

function PasswordStrength({ password }: { password: string }) {
  const score = strengthScore(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? STRENGTH_COLORS[score] : 'bg-border'
              }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength:{' '}
        <span className="font-medium text-foreground">
          {STRENGTH_LABELS[score]}
        </span>
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpdatePasswordForm({ className = '' }: Props) {
  const passwordInput = useRef<HTMLInputElement>(null);
  const currentPasswordInput = useRef<HTMLInputElement>(null);

  const { data, setData, errors, put, reset, processing, recentlySuccessful } =
    useForm<PasswordFormData>({
      current_password: '',
      password: '',
      password_confirmation: '',
    });

  const updatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('password.update'), {
      preserveScroll: true,
      onSuccess: () => reset(),
      onError: (errors) => {
        if (errors.password) {
          reset('password', 'password_confirmation');
          passwordInput.current?.focus();
        }
        if (errors.current_password) {
          reset('current_password');
          currentPasswordInput.current?.focus();
        }
      },
    });
  };

  return (
    <Card className={`rounded-xl border shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-base font-semibold font-heading">
          Update Password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Use a long, random password to keep your account secure.
          Minimum 8 characters.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={updatePassword} className="space-y-5">

          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Current Password</Label>
            <PasswordInput
              id="current_password"
              value={data.current_password}
              onChange={(e) => setData('current_password', e.target.value)}
              autoComplete="current-password"
              placeholder="Your current password"
            />
            {errors.current_password && (
              <p className="text-xs text-destructive">{errors.current_password}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <PasswordInput
              id="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <PasswordStrength password={data.password} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password_confirmation">Confirm New Password</Label>
            <PasswordInput
              id="password_confirmation"
              value={data.password_confirmation}
              onChange={(e) => setData('password_confirmation', e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat your new password"
            />
            {/* Mismatch hint (client-side, before server validates) */}
            {data.password_confirmation &&
              data.password !== data.password_confirmation && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            {errors.password_confirmation && (
              <p className="text-xs text-destructive">{errors.password_confirmation}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={processing}
              className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
              title="Update your password"
            >
              {processing && <Loader2 className="size-4 mr-2 animate-spin" />}
              {processing ? 'Updating...' : 'Update Password'}
            </Button>

            {recentlySuccessful && (
              <span className="flex items-center gap-1.5 text-sm text-brand-700 font-medium">
                <CheckCircle2 className="size-4" />
                Updated
              </span>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
