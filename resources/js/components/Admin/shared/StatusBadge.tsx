import React from 'react';
import { cn } from '@/lib/utils';

const MAP: Record<string, { label: string; classes: string }> = {
  pending:     { label: 'Pending',     classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  approved:    { label: 'Approved',    classes: 'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300'  },
  allocated:   { label: 'Allocated',   classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  waitlisted:  { label: 'Waitlisted',  classes: 'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300'   },
  rejected:    { label: 'Rejected',    classes: 'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300'    },
  cancelled:   { label: 'Cancelled',   classes: 'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300'    },
  checked_in:  { label: 'Checked In',  classes: 'bg-teal-100   text-teal-800   dark:bg-teal-900/30   dark:text-teal-300'   },
  checked_out: { label: 'Checked Out', classes: 'bg-slate-100  text-slate-700  dark:bg-slate-800     dark:text-slate-300'  },
  overridden:  { label: 'Overridden',  classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  const e = MAP[status] ?? { label: status, classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', e.classes, className)}>
      {e.label}
    </span>
  );
}
