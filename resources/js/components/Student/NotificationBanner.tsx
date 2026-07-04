// resources/js/components/Student/NotificationBanner.tsx

import React from 'react';
import { route } from 'ziggy-js';
import { Link } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export type BannerVariant = 'info' | 'warning' | 'success' | 'error';

export interface BannerCta {
  href: string;
  label: string;
}

interface Props {
  message: string;
  variant?: BannerVariant;
  cta?: BannerCta;
  onDismiss?: () => void;
}

// ── Style map (keyed to the literal union — no implicit any) ──────────────────

const VARIANT_CLASSES: Record<BannerVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBanner({
  message,
  variant = 'info',
  cta,
  onDismiss,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
        VARIANT_CLASSES[variant],   // ← keyed to BannerVariant, no 'any' error
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Bell className="size-4 shrink-0 text-accent-500" />
        <span className="truncate">{message}</span>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-3 shrink-0">
        {cta && (
          <Link
            href={cta.href}
            className="font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
          >
            {cta.label}
          </Link>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded hover:bg-black/10 p-0.5 transition-colors"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
