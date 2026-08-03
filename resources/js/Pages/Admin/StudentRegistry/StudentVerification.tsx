// resources/js/Pages/Admin/StudentRegistry/StudentVerification.tsx
import React, { useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { Head, router } from '@inertiajs/react';
import { ShieldCheck, UserCheck, PlusCircle, MailCheck, Link2 } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FilterBar from '@/components/Admin/shared/FilterBar';
import DataTable from '@/components/Admin/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentVerification({ unmatched, matched, filters, stats }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [form, setForm] = useState<any>({ name: '', email: '', password: '', password_confirmation: '', verify_email: true, user_id: '' });

  const beginCreate = (record: any) => {
    setSelected(record);
    setMode('create');
    setForm({
      name: `${record.first_name} ${record.last_name}`.trim(),
      email: record.student_email ?? '',
      password: '',
      password_confirmation: '',
      verify_email: true,
      user_id: '',
    });
  };

  const beginLink = (record: any) => {
    setSelected(record);
    setMode('link');
    setForm({ name: '', email: '', password: '', password_confirmation: '', verify_email: true, user_id: '' });
  };

  const submit = () => {
    if (!selected) return;

    if (mode === 'create') {
      router.post(route('admin.student-registry.verification.create-user', { record: selected.id }), form, { preserveScroll: true, onSuccess: () => setSelected(null) });
      return;
    }

    router.post(route('admin.student-registry.verification.link', { record: selected.id }), { user_id: form.user_id, verify_email: form.verify_email }, { preserveScroll: true, onSuccess: () => setSelected(null) });
  };

  const unmatchedColumns = useMemo(() => [
    { key: 'reg', header: 'Reg Number', cell: (r: any) => <span className="font-mono text-xs">{r.reg_number}</span> },
    { key: 'name', header: 'Name', cell: (r: any) => <span className="text-sm">{r.first_name} {r.last_name}</span> },
    { key: 'email', header: 'Student Email', cell: (r: any) => <span className="text-xs text-muted-foreground">{r.student_email ?? '—'}</span> },
    { key: 'faculty', header: 'Faculty / Course', cell: (r: any) => <div><p className="text-xs">{r.faculty}</p><p className="text-xs text-muted-foreground">{r.course}</p></div> },
    { key: 'gender', header: 'Gender', cell: (r: any) => <span className="text-xs capitalize">{r.gender}</span> },
    { key: 'status', header: '', cell: () => <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Unmatched</Badge> },
    {
      key: 'actions', header: '', cell: (r: any) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => beginLink(r)}><Link2 className="size-3.5 mr-1" /> Link User</Button>
          <Button size="sm" className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={() => beginCreate(r)}><PlusCircle className="size-3.5 mr-1" /> Create Account</Button>
        </div>
      ), className: 'text-right'
    },
  ], []);

  const matchedColumns = useMemo(() => [
    { key: 'name', header: 'Record', cell: (r: any) => <span className="text-sm">{r.first_name} {r.last_name}</span> },
    { key: 'reg', header: 'Reg Number', cell: (r: any) => <span className="font-mono text-xs">{r.reg_number}</span> },
    { key: 'user', header: 'Linked User', cell: (r: any) => <div><p className="text-xs font-medium">{r.user?.name}</p><p className="text-xs text-muted-foreground">{r.user?.email}</p></div> },
    { key: 'meta', header: 'Verification Meta', cell: (r: any) => <div><p className="text-xs text-muted-foreground">Matched {r.matched_at ? new Date(r.matched_at).toLocaleString() : '—'}</p><p className="text-xs text-muted-foreground">By {r.matched_by?.name ?? '—'}</p></div> },
    { key: 'status', header: '', cell: (r: any) => <Badge className="text-[10px] bg-[#137c41] text-white">Matched</Badge> },
    {
      key: 'actions', header: '', cell: (r: any) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => router.post(route('admin.student-registry.verification.verify-email', { record: r.id }), { action: 'mark' })}><MailCheck className="size-3.5 mr-1" /> Mark Email Verified</Button>
          <Button size="sm" variant="outline" onClick={() => router.post(route('admin.student-registry.verification.verify-email', { record: r.id }), { action: 'resend' })}>Resend Verification</Button>
        </div>
      ), className: 'text-right'
    },
  ], []);

  return (
    <AuthenticatedLayout title="Student Verification" breadcrumbs={[
      { label: 'Dashboard', href: route('admin.dashboard') },
      { label: 'Students', href: route('admin.students.index') },
      { label: 'Verification' },
    ]}>
      <Head title="Student Verification — Admin" />
      <div className="space-y-5 px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="size-5 text-[#f1b418]" />Student Verification</h1>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Total Records', val: stats.total_verified_records }, { label: 'Matched', val: stats.matched_count }, { label: 'Unmatched', val: stats.unmatched_count }].map(c => (
            <div key={c.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold tabular-nums mt-0.5">{c.val}</p>
            </div>
          ))}
        </div>

        <FilterBar filters={filters} routeName="admin.student-registry.verification" config={[
          { key: 'search', type: 'search', label: 'Search', placeholder: 'Name, reg number, or email…' },
        ]} />

        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-700"><UserCheck className="size-4" />Unmatched Records ({unmatched.total})</h2>
          <DataTable data={unmatched.data} columns={unmatchedColumns} paginator={unmatched} emptyMessage="All records matched ✓" emptyIcon={<ShieldCheck className="size-10" />} />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#137c41]"><ShieldCheck className="size-4" />Recently Matched ({matched.length})</h2>
          <DataTable data={matched} columns={matchedColumns} emptyMessage="No matched records yet." emptyIcon={<UserCheck className="size-10" />} />
        </section>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create Student User Account' : 'Link Existing User Account'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              Verification flow has priority, but user creation and verification actions still delegate to UserManagementController for sanitization, hashing, activity logging, and role guard consistency.
            </div>

            {mode === 'create' ? (
              <div className="grid gap-3">
                <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" value={form.email} onChange={(e) => setForm((p: any) => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="password">Password (optional)</Label><Input id="password" type="password" value={form.password} onChange={(e) => setForm((p: any) => ({ ...p, password: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="password_confirmation">Confirm Password</Label><Input id="password_confirmation" type="password" value={form.password_confirmation} onChange={(e) => setForm((p: any) => ({ ...p, password_confirmation: e.target.value }))} /></div>
              </div>
            ) : (
              <div className="space-y-1.5"><Label htmlFor="user_id">Existing User ID</Label><Input id="user_id" value={form.user_id} onChange={(e) => setForm((p: any) => ({ ...p, user_id: e.target.value }))} placeholder="Enter existing user id" /></div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.verify_email} onChange={(e) => setForm((p: any) => ({ ...p, verify_email: e.target.checked }))} />
              Mark email as verified after linking/creation
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={submit}>{mode === 'create' ? 'Create & Link' : 'Link User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
