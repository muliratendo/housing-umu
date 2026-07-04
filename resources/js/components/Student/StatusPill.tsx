// File: resources/js/components/Student/StatusPill.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_applied:  { label: 'Not Applied',   className: 'bg-muted text-muted-foreground border border-border' },
  pending:      { label: 'Pending',        className: 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300' },
  allocated:    { label: 'Allocated',      className: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300' },
  waitlisted:   { label: 'Waitlisted',     className: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300' },
  rejected:     { label: 'Rejected',       className: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300' },
  checked_in:   { label: 'Checked In',     className: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300' },
  checked_out:  { label: 'Checked Out',    className: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800/50 dark:text-gray-400' },
  evicted:      { label: 'Evicted',        className: 'bg-red-200 text-red-900 border border-red-400' },
  open:         { label: 'Open',           className: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  in_progress:  { label: 'In Progress',    className: 'bg-blue-100 text-blue-800 border border-blue-300' },
  resolved:     { label: 'Resolved',       className: 'bg-green-100 text-green-800 border border-green-300' },
  closed:       { label: 'Closed',         className: 'bg-gray-100 text-gray-700 border border-gray-300' },
};

interface StatusPillProps {
  status: string;
  waitlistPosition?: number | null;   // ← optional
  className?: string;                  // ← optional
}


export default function StatusPill({
  status,
  waitlistPosition = null,
  className = '',
}: StatusPillProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', config.className, className)}>
      {config.label}
      {status === 'waitlisted' && waitlistPosition != null && (
        <span className="ml-1 font-bold">#{waitlistPosition}</span>
      )}
    </Badge>
  );
}
