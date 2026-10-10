// resources/js/Pages/Admin/Hostels/Form.tsx
// NEW FILE: shared Create/Edit form for hostels.
import React, { useState, useEffect } from 'react';
import { route } from 'ziggy-js';
import { Head, useForm, Link, } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface Manager {
  id: number;
  name: string;
  email: string;
  roles: Array<{
    id: number;
    name: string;
  }>;
}

interface Props {
  hostel: {
    id: number;
    name: string;
    manager_ids?: number[];
    // Keep your existing fields here.
  } | null;
  eligibleManagers: Manager[];
  can: {
    manageManagers: boolean;
  };
}

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

  is_religious_order: boolean;
  religious_notes: string | null;
  amenities: string[] | null;
  image_url: string | null;

  manager_ids: number[];
}

export default function HostelForm({ hostel }: { hostel: HostelShape | null }) {
  const goBack = () => {
    // If the page was opened through normal Inertia/browser navigation, return
    // to the actual previous screen — commonly the hostel management workspace.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Fallback for direct visits, copied URLs, or a newly opened browser tab.
    // This prevents Cancel from appearing to do nothing.
    window.location.assign(route('admin.hostels.index'));
  };

  const mode = hostel ? 'edit' : 'create';

  const { data, setData, post, patch, processing, errors } = useForm({
    name: hostel?.name ?? '',
    slug: hostel?.slug ?? '',
    location: hostel?.location ?? '',
    management_type: hostel?.management_type ?? 'campus-managed',
    campus_location: hostel?.campus_location ?? 'on-campus',
    gender_scope: hostel?.gender_scope ?? 'mixed',
    applications_open: hostel?.applications_open ?? false,
    is_religious_order: hostel?.is_religious_order ?? false,
    religious_notes: hostel?.religious_notes ?? '',
    amenities: hostel?.amenities ?? [],
    description: hostel?.description ?? '',
    image_url: hostel?.image_url ?? '',
  });

  const [amenitiesText, setAmenitiesText] = useState(
    (hostel?.amenities ?? []).join(', '),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      post(route('admin.hostels.store'));
    } else {
      patch(route('admin.hostels.update', { hostel: hostel!.id }));
    }
  };

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    const slug = data.slug.trim();

    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSlugAvailable(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setCheckingSlug(true);

      try {
        const response = await fetch(
          route('admin.hostels.slug-availability', {
            slug,
            ignore: hostel?.id,
          }),
          {
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          },
        );

        const result: { available: boolean } = await response.json();
        setSlugAvailable(result.available);
      } catch {
        // The normal submit endpoint remains authoritative. Do not prevent
        // saving merely because a convenience availability check timed out.
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [data.slug, hostel?.id]);

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
                  <Input value={data.name} maxLength={150} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Assumption Ladies Hostel" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Image Link</Label>
                  <Input
                    type="url"
                    value={data.image_url}
                    maxLength={500}
                    onChange={(event) => setData('image_url', event.target.value)}
                    placeholder="https://housing.umu.ac.ug/hostel-photo.jpg"
                  />
                  {errors.image_url && <p className="text-xs text-red-500 mt-1">{errors.image_url}</p>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slug">Slug</Label>

                    <span className="text-xs text-muted-foreground">
                      {data.slug.length}/180
                    </span>
                  </div>

                  <Input id="slug" value={data.slug} maxLength={180}
                      onChange={(event) => { setData( 'slug',
                        event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-]/g, ''),
                      );
                    }}
                    placeholder="e.g. assumption-ladies-hostel"
                  />

                  {checkingSlug && (
                    <p className="text-xs text-muted-foreground">
                      Checking availability…
                    </p>
                  )}

                  {!checkingSlug && slugAvailable === true && (
                    <p className="text-xs text-green-700">
                      This slug is available.
                    </p>
                  )}

                  {!checkingSlug && slugAvailable === false && (
                    <p className="text-xs text-red-600">
                      This slug is unavailable or has an invalid format.
                    </p>
                  )}

                  {errors.slug && (
                    <p className="text-xs text-red-500">{errors.slug}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Management Type</Label>
                  <Select value={data.management_type} onValueChange={(v) => setData('management_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campus-managed" defaultChecked>Campus Managed</SelectItem>
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
                  <Input value={data.location} maxLength={250} onChange={(e) => setData('location', e.target.value)} placeholder="e.g. Nyamitanga Hill" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={data.description} maxLength={2000} onChange={(e) => setData('description', e.target.value)} rows={3} />
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch checked={data.applications_open} onCheckedChange={(v) => setData('applications_open', v)} />
                <div>
                  <Label>Open for Applications</Label>
                  <p className="text-xs text-muted-foreground">Students can select this hostel while applying.</p>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={data.is_religious_order}
                    onCheckedChange={(value) => {
                      setData('is_religious_order', value);

                      // NEW: clearing avoids retaining hidden notes when the hostel is no
                      // longer classified as a religious order.
                      if (!value) {
                        setData('religious_notes', '');
                      }
                    }}
                  />

                  <div>
                    <Label>Religious order hostel</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable only when the hostel is managed by a religious institution.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="religious_notes">Religious order notes</Label>
                    <span className="text-xs text-muted-foreground">
                      {data.religious_notes.length}/2000
                    </span>
                  </div>

                  <Textarea
                    id="religious_notes"
                    value={data.religious_notes}
                    maxLength={2000}
                    disabled={!data.is_religious_order}
                    onChange={(event) => setData('religious_notes', event.target.value)}
                    placeholder={
                      data.is_religious_order
                        ? 'Describe applicable order, values, or residence expectations.'
                        : 'Enable “Religious order hostel” to add notes.'
                    }
                    className={!data.is_religious_order ? 'cursor-not-allowed opacity-50' : ''}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amenities">Amenities</Label>

                <Input
                  id="amenities"
                  value={amenitiesText}
                  maxLength={1000}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAmenitiesText(value);

                    setData(
                      'amenities',
                      value
                        .split(',')
                        .map((amenity) => amenity.trim())
                        .filter(Boolean),
                    );
                  }}
                  placeholder="e.g. Wi-Fi, Laundry, Study room, Security"
                />

                <p className="text-xs text-muted-foreground">
                  Separate amenities with commas.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                {/* NEW: returns managers to their Manage Hostel workspace
                    when they came from there, returns global
                    administrators to the catalogue when they came
                    from the catalogue, and still gives direct URL
                    visitors a predictable fallback. */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  // onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
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
