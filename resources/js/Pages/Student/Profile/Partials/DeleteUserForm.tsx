// File: resources/js/Pages/Profile/Partials/DeleteUserForm.tsx
import React, { useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { AlertTriangle, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

interface DeleteFormData {
  password: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeleteUserForm({ className = '' }: Props) {
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const passwordInput = useRef<HTMLInputElement>(null);

  const {
    data,
    setData,
    delete: destroy,
    processing,
    reset,
    errors,
    clearErrors,
  } = useForm<DeleteFormData>({ password: '' });

  const confirmUserDeletion = () => {
    setConfirmingDeletion(true);
  };

  const deleteUser = (e: React.FormEvent) => {
    e.preventDefault();
    destroy(route('profile.destroy'), {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onError: () => passwordInput.current?.focus(),
      onFinish: () => reset(),
    });
  };

  const closeModal = () => {
    setConfirmingDeletion(false);
    clearErrors();
    reset();
  };

  return (
    <>
      <Card className={`rounded-xl border border-destructive/30 shadow-sm ${className}`}>
        <CardHeader>
          <CardTitle className="text-base font-semibold font-heading flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            Delete Account
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Once your account is deleted, all of its resources and data will be permanently
            removed. This action is irreversible — please download any data you want to keep
            before proceeding.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            variant="destructive"
            onClick={confirmUserDeletion}
            title="Permanently delete your account"
          >
            <Trash2 className="size-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ──────────────────────────────────────────────── */}
      <Dialog open={confirmingDeletion} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              Delete Account?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data — housing
              applications, allocations, and maintenance requests included. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={deleteUser} id="delete-account-form" className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="delete_password">
                Enter your password to confirm
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="delete_password"
                  ref={passwordInput}
                  type="password"
                  className="pl-9"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  placeholder="Your current password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
          </form>

          <DialogFooter className="gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={processing}
              title="Cancel and keep your account"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="delete-account-form"
              variant="destructive"
              disabled={processing}
              title="Permanently delete account"
            >
              {processing && <Loader2 className="size-4 mr-2 animate-spin" />}
              {processing ? 'Deleting...' : 'Yes, Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
