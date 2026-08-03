// resources/js/Pages/Admin/Maintenance/Show.tsx
import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  MessageSquare,
  User2,
  Wrench,
} from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FULL_TRANSITIONS } from '@/lib/maintenanceTransitions';

const STATUS_COLOR: Record<string, string> = {
  open: 'border-red-300 text-red-700 bg-red-50',
  in_progress: 'border-yellow-300 text-yellow-700 bg-yellow-50',
  resolved: 'border-green-300 text-green-700 bg-green-50',
  closed: 'border-gray-300 text-gray-600 bg-gray-50',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

type Props = {
  maintenanceRequest: any;
  can: { update: boolean };
};

export default function MaintenanceShow({ maintenanceRequest, can }: Props) {
  const req = maintenanceRequest;

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const statusLabel = useMemo(() => req.status.replaceAll('_', ' '), [req.status]);
  const availableTransitions = FULL_TRANSITIONS[req.status] ?? [];
  const requiresNote = status === 'closed' || (req.status === 'closed' && status === 'open');

  const openDialog = () => {
    setStatus(availableTransitions[0] ?? req.status);
    setNote('');
    setEditing(true);
  };

  const save = () => {
    if (requiresNote && note.trim().length === 0) return;

    setSaving(true);
    router.patch(
      route('admin.maintenance.update-status', { maintenanceRequest: req.id }),
      { status, admin_note: note },
      {
        preserveScroll: true,
        onFinish: () => {
          setSaving(false);
          setEditing(false);
          setNote('');
        },
      }
    );
  };

  return (
    <AuthenticatedLayout
      title="Maintenance Details"
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Maintenance', href: route('admin.maintenance.index') },
        { label: `Request #${req.id}` },
      ]}
    >
      <Head title={`Maintenance #${req.id} — Admin`} />

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <Link
          href={route('admin.maintenance.index')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Maintenance
        </Link>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <Wrench className="size-4 text-[#f1b418]" />
                  <CardTitle className="text-base font-semibold">{req.subject}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Request #{req.id} · {req.room?.hostel?.name} · Room {req.room?.room_number}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`capitalize ${STATUS_COLOR[req.status] ?? ''}`}>
                  {statusLabel}
                </Badge>
                <Badge className={`capitalize ${PRIORITY_COLOR[req.priority] ?? ''}`}>
                  {req.priority}
                </Badge>
                {can.update && availableTransitions.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-[#137c41] text-white hover:bg-[#0b4b27]"
                    onClick={openDialog}
                  >
                    Update Status
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="font-medium">{req.student?.user?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{req.student?.student_number ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Hostel</p>
                <p className="font-medium">{req.room?.hostel?.name ?? '—'}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {req.room?.hostel?.management_type?.replace('_', ' ') ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="font-medium">{req.room?.room_number ?? '—'}</p>
                <p className="text-xs capitalize text-muted-foreground">{req.room?.room_type ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="font-medium">
                  {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : 'Not yet'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{req.description}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-xl border shadow-sm lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Request Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <User2 className="mt-0.5 size-4 text-[#137c41]" />
                <div>
                  <p className="font-medium">{req.student?.user?.name ?? 'Unknown Student'}</p>
                  <p className="text-xs text-muted-foreground">{req.student?.user?.email ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    Year {req.student?.year_of_study ?? '—'} · {req.student?.programme ?? '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 text-[#137c41]" />
                <div>
                  <p className="font-medium">{req.room?.hostel?.name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    Room {req.room?.room_number ?? '—'} · {req.room?.room_type ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {req.room?.hostel?.campus_location ?? '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 size-4 text-[#137c41]" />
                <div>
                  <p className="font-medium">Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 text-[#137c41]" />
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-xs text-muted-foreground">
                    {req.updated_at ? new Date(req.updated_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              {req.resolved_at && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-green-700" />
                  <div>
                    <p className="font-medium text-green-800">Marked resolved</p>
                    <p className="text-xs text-green-700">
                      {new Date(req.resolved_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-[#f1b418]" />
                Comment History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {req.comments?.length ? (
                req.comments.map((comment: any) => (
                  <div key={comment.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {comment.is_admin ? 'Admin Note' : comment.student?.user?.name ?? 'Student'}
                        </span>
                        {comment.is_admin && (
                          <Badge variant="outline" className="text-[10px]">
                            admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No comments yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full status dialog — every transition available, note required for closing/reopening */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Maintenance Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="line-clamp-2 text-sm text-muted-foreground">{req.subject}</p>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTransitions.map((item) => (
                  <SelectItem key={item} value={item} className="capitalize">
                    {item.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={
                requiresNote
                  ? 'Required: explain the resolution or reason for reopening…'
                  : 'Optional admin note to append to the request history…'
              }
            />
            {requiresNote && note.trim().length === 0 && (
              <p className="text-xs text-red-600">
                A note is required to close or reopen a request.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || (requiresNote && note.trim().length === 0)}
              className="bg-[#137c41] text-white hover:bg-[#0b4b27]"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
