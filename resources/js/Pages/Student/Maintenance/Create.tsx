// File: resources/js/Pages/Student/Maintenance/Create.tsx
import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Building2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AllocationContext {
  hostel_name: string;
  room_number: string;
}

interface Term {
  name: string;
  academic_year: string;
}

interface Props {
  allocation: AllocationContext;
  currentTerm: Term;
}

interface FormData {
  subject: string;
  description: string;
  priority: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenanceCreate({ allocation, currentTerm }: Props) {
  const { data, setData, post, processing, errors } = useForm<FormData>({
    subject: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('student.maintenance.store'));
  };

  return (
    <AuthenticatedLayout
      title="New Maintenance Request"
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: 'Maintenance', href: route('student.maintenance.index') },
        { label: 'New Request' },
      ]}
    >
      <Head title="New Maintenance Request – Housing@UMU" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Allocation context (read-only) */}
        <Card className="rounded-xl border shadow-sm bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-brand-700/10 p-2.5">
              <Building2 className="size-5 text-brand-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reporting for</p>
              <p className="font-semibold text-foreground">{allocation.hostel_name}</p>
              <p className="text-xs text-muted-foreground">
                Room {allocation.room_number} · {currentTerm.name}
              </p>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="size-4 text-accent-500" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g. Broken window, Leaking pipe..."
                  value={data.subject}
                  onChange={(e) => setData('subject', e.target.value)}
                  maxLength={255}
                  required
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">{errors.subject}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail..."
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  rows={5}
                  maxLength={3000}
                  className="resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {data.description.length}/3000
                </p>
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={data.priority}
                  onValueChange={(v) => setData('priority', v)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low – Minor inconvenience</SelectItem>
                    <SelectItem value="medium">Medium – Affects daily routine</SelectItem>
                    <SelectItem value="high">High – Significant impact</SelectItem>
                    <SelectItem value="urgent">Urgent – Safety/health risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href={route('student.maintenance.index')}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-semibold"
              title="Submit maintenance request"
            >
              {processing ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>

      </div>
    </AuthenticatedLayout>
  );
}
