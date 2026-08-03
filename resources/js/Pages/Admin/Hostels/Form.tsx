// resources/js/Pages/Admin/Hostels/Form.tsx
// NEW FILE: shared Create/Edit form for hostels.
import React from 'react';
import { route } from 'ziggy-js';
import { Head, useForm, Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface HostelShape {
  id: number;
  name: string;
  slug: string;
  management_type: string;
  gender_scope: string;
  campus_location: string;
  location: string | null;
  description: string | null;
  applications_open: boolean;
}

export default function HostelForm({ hostel }: { hostel: HostelShape | null }) {
  const mode = hostel ? 'edit' : 'create';

  const { data, setData, post, patch, processing, errors } = useForm({
    name: hostel?.name ?? '',
    slug: hostel?.slug ?? '',
    management_type: hostel?.management_type ?? 'campus-managed',
    gender_scope: hostel?.gender_scope ?? 'mixed',
    campus_location: hostel?.campus_location ?? 'on-campus',
    location: hostel?.location ?? '',
    description: hostel?.description ?? '',
    applications_open: hostel?.applications_open ?? false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      post(route('admin.hostels.store'));
    } else {
      patch(route('admin.hostels.update', { hostel: hostel!.id }));
    }
  };

  return (
    <AuthenticatedLayout
      title={mode === 'create' ? 'New Hostel' : `Edit ${hostel?.name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: mode === 'create' ? 'New Hostel' : `Edit ${hostel?.name}` },
      ]}
    >
      <Head title={mode === 'create' ? 'New Hostel — Admin' : `Edit ${hostel?.name} — Admin`} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Building2 className="size-5 text-[#f1b418]" />
          {mode === 'create' ? 'New Hostel' : `Edit ${hostel?.name}`}
        </h1>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Name</Label>
                  <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Assumption Ladies Hostel" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Management Type</Label>
                  <Select value={data.management_type} onValueChange={(v) => setData('management_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campus-managed">Campus Managed</SelectItem>
                      <SelectItem value="affiliated">Affiliated</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.management_type && <p className="text-xs text-red-500 mt-1">{errors.management_type}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Gender Scope</Label>
                  <Select value={data.gender_scope} onValueChange={(v) => setData('gender_scope', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender_scope && <p className="text-xs text-red-500 mt-1">{errors.gender_scope}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Campus Location</Label>
                  <Select value={data.campus_location} onValueChange={(v) => setData('campus_location', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-campus">On Campus</SelectItem>
                      <SelectItem value="off-campus">Off Campus</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.campus_location && <p className="text-xs text-red-500 mt-1">{errors.campus_location}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Location / Address</Label>
                  <Input value={data.location} onChange={(e) => setData('location', e.target.value)} placeholder="e.g. Nyamitanga Hill" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch checked={data.applications_open} onCheckedChange={(v) => setData('applications_open', v)} />
                <div>
                  <Label>Open for Applications</Label>
                  <p className="text-xs text-muted-foreground">Students can select this hostel while applying.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Link href={route('admin.hostels.index')}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" className="bg-[#137c41] hover:bg-[#0b4b27] text-white" disabled={processing}>
                  {processing ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create Hostel' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
