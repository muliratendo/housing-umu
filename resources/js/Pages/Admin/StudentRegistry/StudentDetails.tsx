// resources/js/Pages/Admin/StudentRegistry/StudentDetails.tsx
import React, { useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { Head, Link, router } from '@inertiajs/react';
import { User, BedDouble, Wrench, FileText, ChevronLeft, ShieldCheck, MailCheck, KeyRound } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentDetails({ student, verifiedRecord, roles, permissions, allRoles, allPermissions }: any) {
  const { user, applications, allocations, maintenance_requests: maintenance } = student;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [pickedRoles, setRoles] = useState<string[]>(roles ?? []);
  const [pickedPerms, setPerms] = useState<string[]>(permissions ?? []);
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    student_number: student.student_number ?? '',
    registration_number: student.registration_number ?? '',
    year_of_study: String(student.year_of_study ?? ''),
    gender: student.gender ?? '',
    programme: student.programme ?? '',
    faculty: student.faculty ?? '',
  });
  const [password, setPassword] = useState({ password: '', password_confirmation: '' });

  const toggle = (list: string[], setter: any, value: string) => setter((prev: string[]) => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const saveProfile = () => {
    setSaving(true);
    router.patch(route('admin.students.update', { student: student.id }), profile, { preserveScroll: true, onFinish: () => setSaving(false) });
  };

  const saveRoles = () => {
    setSaving(true);
    router.patch(route('admin.students.roles.update', { student: student.id }), { roles: pickedRoles }, { preserveScroll: true, onFinish: () => setSaving(false) });
  };

  const savePermissions = () => {
    setSaving(true);
    router.patch(route('admin.students.permissions.update', { student: student.id }), { permissions: pickedPerms }, { preserveScroll: true, onFinish: () => setSaving(false) });
  };

  const savePassword = () => {
    setSaving(true);
    router.patch(route('admin.students.password.update', { student: student.id }), password, { preserveScroll: true, onFinish: () => setSaving(false) });
  };

  const verificationMeta = useMemo(() => ({
    emailVerified: !!user?.email_verified_at,
    inVerifiedRecord: !!verifiedRecord,
  }), [user, verifiedRecord]);

  return (
    <AuthenticatedLayout title={user?.name} breadcrumbs={[
      { label: 'Dashboard', href: route('admin.dashboard') },
      { label: 'Student Registry', href: route('admin.students.index') },
      { label: user?.name ?? student.student_number },
    ]}>
      <Head title={`${user?.name} — Admin`} />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href={route('admin.students.index')} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3" /> Back to registry
          </Link>
          <div className="flex items-center gap-2">
            <Link href={route('admin.student-registry.verification')} className="text-xs text-[#137c41] hover:underline inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> Open verification queue
            </Link>
            <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={() => setOpen(true)}>Edit Student</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 flex flex-wrap gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">{user?.name?.[0] ?? 'S'}</div>
            <div>
              <h1 className="text-lg font-semibold">{user?.name}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{student.student_number} · Y{student.year_of_study} · {student.programme}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto items-start max-w-xl justify-end">
            {(roles ?? []).map((r: string) => <Badge key={r} variant="outline" className="capitalize text-[10px]">{r.replaceAll('_', ' ')}</Badge>)}
            {verificationMeta.inVerifiedRecord && <Badge className="text-[10px] bg-[#137c41] text-white">In Verified Student Record</Badge>}
            {verificationMeta.emailVerified
              ? <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">Email Verified</Badge>
              : <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Email Unverified</Badge>}
          </div>
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="size-4" /> Verification Status</h2>
            <Link href={route('admin.student-registry.verification')} className="text-xs text-[#137c41] hover:underline">Manage in verification flow</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground mb-1">Verified Student Record</p>
              <p>{verificationMeta.inVerifiedRecord ? verifiedRecord.full_name : 'No linked verified record.'}</p>
              {verifiedRecord && (
                <p className="text-xs text-muted-foreground mt-1">
                  Matched {verifiedRecord.matched_at ? new Date(verifiedRecord.matched_at).toLocaleString() : '—'}
                  {verifiedRecord.matched_by ? ` · by ${verifiedRecord.matched_by.name}` : ''}
                </p>
              )}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground mb-1">Email Verification</p>
              <p>{verificationMeta.emailVerified ? 'User email is verified.' : 'User email is not verified.'}</p>
              {user && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => router.post(route('admin.students.email.verify', { student: student.id }))}>
                    <MailCheck className="size-3.5 mr-1" /> Mark verified
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.post(route('admin.students.email.send', { student: student.id }))}>
                    Resend verification
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {verifiedRecord && (
          <section>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><User className="size-4" /> Registry Record</h2>
            <div className="rounded-lg border bg-card p-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {[['Reg Number', verifiedRecord.reg_number], ['Faculty', verifiedRecord.faculty], ['Course', verifiedRecord.course], ['Gender', verifiedRecord.gender], ['Contact', verifiedRecord.contact ?? '—']].map(([k, v]) => (
                <div key={String(k)}><span className="text-xs text-muted-foreground">{k}: </span><span>{v}</span></div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="size-4" /> Applications ({applications?.length})</h2>
          {applications?.length === 0 ? <p className="text-xs text-muted-foreground">No applications.</p> : <div className="rounded-lg border overflow-hidden"><table className="w-full text-xs"><thead className="bg-muted/50"><tr>{['Term', 'Hostel Pref', 'Status', 'Date'].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y">{applications.map((a: any) => <tr key={a.id}><td className="px-3 py-2">{a.academic_term?.name}</td><td className="px-3 py-2">{a.hostel?.name ?? 'Any'}</td><td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge></td><td className="px-3 py-2 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><BedDouble className="size-4" /> Allocations ({allocations?.length})</h2>
          {allocations?.length === 0 ? <p className="text-xs text-muted-foreground">No allocations.</p> : <div className="rounded-lg border overflow-hidden"><table className="w-full text-xs"><thead className="bg-muted/50"><tr>{['Term', 'Hostel', 'Room', 'Bed', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y">{allocations.map((a: any) => <tr key={a.id}><td className="px-3 py-2">{a.academic_term?.name}</td><td className="px-3 py-2">{a.hostel?.name}</td><td className="px-3 py-2">{a.room?.room_number}</td><td className="px-3 py-2">{a.bed?.label}</td><td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge></td></tr>)}</tbody></table></div>}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Wrench className="size-4" /> Recent Maintenance ({maintenance?.length})</h2>
          {maintenance?.length === 0 ? <p className="text-xs text-muted-foreground">No requests.</p> : <div className="space-y-1.5">{maintenance?.map((m: any) => <div key={m.id} className="rounded-md border px-3 py-2 flex items-center justify-between text-xs"><span>{m.subject}</span><Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge></div>)}</div>}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-base">Manage Student Account</DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ['name', 'Name'], ['email', 'Email'], ['student_number', 'Student Number'], ['registration_number', 'Registration Number'],
                  ['year_of_study', 'Year of Study'], ['gender', 'Gender'], ['programme', 'Programme'], ['faculty', 'Faculty'],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} value={(profile as any)[key] ?? ''} onChange={(e) => setProfile((p: any) => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="roles">
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {allRoles.map((r: any) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={pickedRoles.includes(r.name)} onCheckedChange={() => toggle(pickedRoles, setRoles, r.name)} className="data-[state=checked]:bg-[#137c41]" />
                    <span className="text-sm capitalize">{r.name.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={saveRoles} disabled={saving}>{saving ? 'Saving…' : 'Save Roles'}</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="permissions">
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {allPermissions.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={pickedPerms.includes(p.name)} onCheckedChange={() => toggle(pickedPerms, setPerms, p.name)} className="data-[state=checked]:bg-[#137c41]" />
                    <span className="text-xs">{p.name}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={savePermissions} disabled={saving}>{saving ? 'Saving…' : 'Save Permissions'}</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              <div className="rounded-md border p-3 text-xs text-muted-foreground flex items-start gap-2"><KeyRound className="size-4 mt-0.5" /> Admin-set password changes still route through UserManagementController for hashing and activity logging.</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password.password} onChange={(e) => setPassword((p) => ({ ...p, password: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="password_confirmation">Confirm Password</Label><Input id="password_confirmation" type="password" value={password.password_confirmation} onChange={(e) => setPassword((p) => ({ ...p, password_confirmation: e.target.value }))} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.post(route('admin.students.password.reset', { student: student.id }))}>Send Reset Link</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={savePassword} disabled={saving}>{saving ? 'Saving…' : 'Update Password'}</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
