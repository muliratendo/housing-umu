// resources/js/components/Admin/shared/DataTable.tsx
import React from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Standard Laravel LengthAwarePaginator data returned through Inertia.
 *
 * `from` and `to` may be null when the result set is empty.
 */
interface Paginator {
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
  total: number;
  prev_page_url: string | null;
  next_page_url: string | null;
}
interface Props<T> {
  data: T[];
  columns: Column<T>[];
  paginator?: Paginator;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export default function DataTable<T>({ data, columns, paginator, emptyMessage = 'No data.', emptyIcon }: Props<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        {emptyIcon && <span className="opacity-30">{emptyIcon}</span>}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }
  const goTo = (url: string | null) => url && router.visit(url, { preserveState: true });
  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{columns.map((c) => <th key={c.key} className={`text-left px-4 py-2.5 text-xs font-medium text-muted-foreground ${c.className ?? ''}`}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                {columns.map((c) => <td key={c.key} className={`px-4 py-2.5 ${c.className ?? ''}`}>{c.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginator && paginator.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {paginator.from ?? 0}–{paginator.to ?? 0} of {paginator.total}
          </span>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!paginator.prev_page_url}
              onClick={() => goTo(paginator.prev_page_url)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            <span className="px-2 py-1">
              {paginator.current_page} / {paginator.last_page}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!paginator.next_page_url}
              onClick={() => goTo(paginator.next_page_url)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
