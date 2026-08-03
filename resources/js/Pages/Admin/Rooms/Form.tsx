// resources/js/Pages/Admin/Rooms/Form.tsx
import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { Head, useForm, Link } from '@inertiajs/react';
import { BedDouble, X, Plus } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RoomShape {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  capacity: number;
  price_per_semester: string;
  gender_scope: string;
  description: string | null;
  amenities: string[] | null;
  is_active: boolean;
}

export default function RoomForm({ hostel, room }: { hostel: { id: number; name: string }; room: RoomShape | null }) {
  const mode = room ? 'edit' : 'create';
  const [amenityInput, setAmenityInput] = useState('');

  const { data, setData, post, patch, processing, errors } = useForm({
    name: room?.name ?? '',
    room_number: room?.room_number ?? '',
    room_type: room?.room_type ?? 'single',
    capacity: room?.capacity ?? 1,
    price_per_semester: room?.price_per_semester ?? '',
    gender_scope: room?.gender_scope ?? 'mixed',
    description: room?.description ?? '',
    amenities: room?.amenities ?? [],
    is_active: room?.is_active ?? true,
  });

  const addAmenity = () => {
    const v = amenityInput.trim();
    if (!v || data.amenities.includes(v)) return;
    setData('amenities', [...data.amenities, v]);
    setAmenityInput('');
  };

  const removeAmenity = (v: string) => setData('amenities', data.amenities.filter((a) => a !== v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      post(route('admin.rooms.store', { hostel: hostel.id }));
    } else {
      patch(route('admin.rooms.update', { room: room!.id }));
    }
  };

  return (
    <AuthenticatedLayout
      title={mode === 'create' ? 'New Room' : `Edit ${room?.name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: hostel.name, href: route('admin.hostels.rooms', { hostel: hostel.id }) },
        { label: mode === 'create' ? 'New Room' : `Edit ${room?.name}` },
      ]}
    >
      <Head title={mode === 'create' ? `New Room · ${hostel.name} — Admin` : `Edit ${room?.name} — Admin`} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <BedDouble className="size-5 text-[#f1b418]" />
          {mode === 'create' ? `New Room in ${hostel.name}` : `Edit ${room?.name}`}
        </h1>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Room Name</Label>
                  <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. ALH-APT-S1" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Room Number</Label>
                  <Input value={data.room_number} onChange={(e) => setData('room_number', e.target.value)} />
                  {errors.room_number && <p className="text-xs text-red-500 mt-1">{errors.room_number}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Room Type</Label>
                  <Select value={data.room_type} onValueChange={(v) => setData('room_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Capacity (beds)</Label>
                  <Select value={String(data.capacity)} onValueChange={(v) => setData('capacity', Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Single)</SelectItem>
                      <SelectItem value="2">2 (Double)</SelectItem>
                    </SelectContent>
                  </Select>
                  {room && data.capacity !== room.capacity && (
                    <p className="text-[11px] text-yellow-600">
                      Changing capacity will {data.capacity > room.capacity ? 'add' : 'remove'} beds to match.
                    </p>
                  )}
                  {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Price / Semester (UGX)</Label>
                  <Input type="number" value={data.price_per_semester} onChange={(e) => setData('price_per_semester', e.target.value)} />
                  {errors.price_per_semester && <p className="text-xs text-red-500 mt-1">{errors.price_per_semester}</p>}
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
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Amenities</Label>
                <div className="flex gap-2">
                  <Input
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                    placeholder="e.g. Wi-Fi"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addAmenity}><Plus className="size-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.amenities.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px] gap-1">
                      {a}
                      <button type="button" onClick={() => removeAmenity(a)}><X className="size-2.5" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch checked={data.is_active} onCheckedChange={(v) => setData('is_active', v)} />
                <div>
                  <Label>Room Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive rooms are hidden from student applications.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Link href={mode === 'create' ? route('admin.hostels.rooms', { hostel: hostel.id }) : route('admin.rooms.show', { room: room!.id })}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" className="bg-[#137c41] hover:bg-[#0b4b27] text-white" disabled={processing}>
                  {processing ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create Room' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
