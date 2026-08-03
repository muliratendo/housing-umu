// resources/js/Pages/Admin/Rooms/Beds.tsx

import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BedDouble, Wrench, Plus, Trash2 } from 'lucide-react';

interface Occupant {
  id: number;
  name: string;
  email: string;
}

interface BedRow {
  id: number;
  label: string;
  status: string;
  status_label: string;
  sort_order: number;
  occupant: Occupant | null;
}

interface Hostel {
  id: number;
  name: string;
}

interface RoomMeta {
  id: number;
  name: string;
  room_number: string;
  capacity: number;
  bed_count: number;
  hostel: Hostel;
}

interface Props {
  room: RoomMeta;
  beds: BedRow[];
  statuses: string[];
  canAddBed: boolean;
}

const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  available: 'default',
  occupied: 'destructive',
  reserved: 'secondary',
  maintenance: 'outline',
  inactive: 'outline',
};

const STATUS_COLOR: Record<string, string> = {
  available: 'border-green-300 text-green-700 bg-green-50',
  occupied: 'border-blue-300 text-blue-700 bg-blue-50',
  maintenance: 'border-yellow-300 text-yellow-700 bg-yellow-50',
  reserved: 'border-purple-300 text-purple-700 bg-purple-50',
  inactive: 'border-gray-300 text-gray-600 bg-gray-50',
};

export default function RoomBeds({ room, beds, statuses, canAddBed }: Props) {
  const [editing, setEditing] = useState<BedRow | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingBed, setAddingBed] = useState(false);
  const [removing, setRemoving] = useState<BedRow | null>(null);

  const openEdit = (bed: BedRow) => {
    setEditing(bed);
    setNewStatus(bed.status);
  };

  const closeEdit = () => setEditing(null);

  const save = () => {
    if (!editing) return;
    setSaving(true);
    router.patch(
      route('admin.beds.update-status', { bed: editing.id }),
      { status: newStatus },
      {
        preserveState: true,
        onFinish: () => {
          setSaving(false);
          setEditing(null);
        },
      }
    );
  };

  const addBed = () => {
    setAddingBed(true);
    router.post(route('admin.rooms.beds.store', { room: room.id }), {}, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setAddingBed(false),
    });
  };

  const confirmRemove = () => {
    if (!removing) return;
    router.delete(route('admin.beds.destroy', { bed: removing.id }), {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setRemoving(null),
    });
  };

  return (
    <AuthenticatedLayout
      title={`Beds — Room ${room.room_number}`}
      breadcrumbs={[
        { label: 'Dashboard', href: route('admin.dashboard') },
        { label: 'Hostels', href: route('admin.hostels.index') },
        { label: room.hostel.name, href: route('admin.hostels.rooms', { hostel: room.hostel.id }) },
        { label: `Room ${room.room_number}`, href: route('admin.rooms.show', room.id) },
        { label: 'Beds' },
      ]}
    >
      <Head title={`Beds · Room ${room.room_number} – Housing@UMU`} />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-heading font-semibold flex items-center gap-2">
            <BedDouble className="size-5 text-[#f1b418]" />
            {room.name ?? room.room_number}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              #{room.room_number} · {room.capacity}-bed
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {beds.length}/{room.capacity} bed{room.capacity !== 1 ? 's' : ''}
            </span>
            {/* NEW: "Add Bed" — frontend half of "beds limited to room
                capacity, even in the UI". Disabled once beds.length ===
                room.capacity, with a tooltip explaining why. */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              disabled={!canAddBed || addingBed}
              title={canAddBed ? 'Add another bed to this room' : `Room capacity is ${room.capacity}; increase capacity on the room's Edit page to add more beds.`}
              onClick={addBed}
            >
              <Plus className="size-3.5" /> {addingBed ? 'Adding…' : 'Add Bed'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {beds.map((bed) => (
            <Card
              key={bed.id}
              className={`rounded-xl shadow-sm ${STATUS_COLOR[bed.status] ?? ''}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <BedDouble className="size-4 text-accent-500" />
                  <CardTitle className="text-sm font-semibold">{bed.label}</CardTitle>
                </div>
                <Badge variant={variantMap[bed.status] ?? 'default'}>
                  {bed.status_label}
                </Badge>
              </CardHeader>

              <CardContent className="text-sm space-y-3">
                {bed.occupant ? (
                  <div className="space-y-0.5">
                    <p className="font-medium">{bed.occupant.name}</p>
                    <p className="text-xs text-muted-foreground">{bed.occupant.email}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs">No occupant</p>
                )}

                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="size-3.5 text-accent-500 shrink-0" />
                    <span className="capitalize">{bed.status}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs p-0"
                      disabled={bed.status === 'occupied'}
                      title={
                        bed.status === 'occupied'
                          ? 'Check out the student to change this status'
                          : 'Update bed status'
                      }
                      onClick={() => openEdit(bed)}
                    >
                      Change
                    </Button>
                    {/* NEW: remove-bed action — disabled for
                        occupied/reserved beds, confirmed via
                        AlertDialog since it's destructive. */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-600 hover:text-red-700"
                      disabled={bed.status === 'occupied' || bed.status === 'reserved'}
                      title={
                        bed.status === 'occupied' || bed.status === 'reserved'
                          ? 'Cannot remove an occupied or reserved bed'
                          : 'Remove this bed'
                      }
                      onClick={() => setRemoving(bed)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Update Bed {editing?.label}</DialogTitle>
          </DialogHeader>

          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              className="bg-[#137c41] hover:bg-[#0b4b27] text-white"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the bed record. This cannot be undone. To add it back later, use "Add Bed" (subject to the room's capacity limit).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700 text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}
