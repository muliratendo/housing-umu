// resources/js/Pages/Admin/Maintenance/Index.tsx
import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Wrench } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FilterBar from '@/components/Admin/shared/FilterBar';
import DataTable from '@/components/Admin/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { QUICK_TRANSITIONS } from '@/lib/maintenanceTransitions';

const STATUS_COLOR: Record<string, string> = {
  open: 'border-red-300 text-red-700',
  in_progress: 'border-yellow-300 text-yellow-700',
  resolved: 'border-green-300 text-green-700',
  closed: 'border-gray-300 text-gray-600',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-600',
  low: 'text-gray-500',
};

const QUICK_ACTION_LABEL: Record<string, string> = {
  in_progress: 'Start work',
  resolved: 'Mark resolved',
};

export default function MaintenanceIndex({ requests, hostels, filters, statuses, priorities }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [newStatus, setNew] = useState('');
  const [saving, setSaving] = useState(false);

  const options = editing ? QUICK_TRANSITIONS[editing.status] ?? [] : [];

  const open = (r: any) => {
    const opts = QUICK_TRANSITIONS[r.status] ?? [];
    if (opts.length === 0) return;
    setEditing(r);
    setNew(opts[0]);
  };

  // Quick edits never carry a note — investigation notes belong on the detail page.
  const save = () => {
    if (!editing || !newStatus) return;

    setSaving(true);
    router.patch(
      route('admin.maintenance.update-status', { maintenanceRequest: editing.id }),
      { status: newStatus },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          setSaving(false);
          setEditing(null);
        },
      }
    );
  };

  const columns = [
    {
      key: 'subject',
      header: 'Request',
      cell: (r: any) => (
        <div className="min-w-0">
          <Link
            href={route('admin.maintenance.show', { maintenanceRequest: r.id })}
            className="font-medium text-sm line-clamp-1 text-[#137c41] hover:underline"
          >
            {r.subject}
          </Link>
          <p className="text-xs text-muted-foreground">
            {r.room?.hostel?.name} · {r.student?.user?.name}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (r: any) => (
        <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[r.priority] ?? ''}`}>
          {r.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r: any) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLOR[r.status] ?? ''}`}>
          {r.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Reported',
      cell: (r: any) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (r: any) => {
        const quickOptions = QUICK_TRANSITIONS[r.status] ?? [];
        return (
          <div className="flex justify-end gap-1">
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href={route('admin.maintenance.show', { maintenanceRequest: r.id })}>
                <Eye className="mr-1 size-3.5" />
                View
              </Link>
            </Button>
            {quickOptions.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-[#137c41]"
                onClick={() => open(r)}
              >
                {QUICK_ACTION_LABEL[quickOptions[0]] ?? 'Update'}
              </Button>
            ) : (
              <span className="px-2 text-[10px] text-muted-foreground">Review required</span>
            )}
          </div>
        );
      },
      className: 'text-right',
    },
  ];

  return (
    <AuthenticatedLayout
      title="Maintenance"
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Maintenance' },
      ]}
    >
      <Head title="Maintenance — Admin" />

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <Wrench className="size-5 text-[#f1b418]" />
          <h1 className="text-lg font-semibold">Maintenance Requests</h1>
          <span className="ml-auto text-xs text-muted-foreground">{requests.total} requests</span>
        </div>

        <FilterBar
          filters={filters}
          routeName="admin.maintenance.index"
          config={[
            { key: 'search', type: 'search', label: 'Search', placeholder: 'Subject…' },
            {
              key: 'status',
              type: 'select',
              label: 'Status',
              options: statuses.map((s: string) => ({ value: s, label: s.replace('_', ' ') })),
            },
            {
              key: 'priority',
              type: 'select',
              label: 'Priority',
              options: priorities.map((p: string) => ({ value: p, label: p })),
            },
            {
              key: 'hostel_id',
              type: 'select',
              label: 'Hostel',
              options: hostels.map((h: any) => ({ value: String(h.id), label: h.name })),
            },
          ]}
        />

        <DataTable
          data={requests.data}
          columns={columns}
          paginator={requests}
          emptyMessage="No maintenance requests."
          emptyIcon={<Wrench className="size-10" />}
        />
      </div>

      {/* Quick-action confirmation — no note field, no full status list */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Quick Update</DialogTitle>
          </DialogHeader>

          <p className="line-clamp-2 text-sm text-muted-foreground">{editing?.subject}</p>

          {options.length > 1 ? (
            <Select value={newStatus} onValueChange={setNew}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="rounded-md border bg-muted/40 p-3 text-sm">
              Move this request to{' '}
              <span className="font-medium capitalize">{newStatus.replace('_', ' ')}</span>?
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Need to add context or close this out? Open the full request instead.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#137c41] text-white hover:bg-[#0b4b27]"
              onClick={save}
              disabled={saving || !newStatus}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
