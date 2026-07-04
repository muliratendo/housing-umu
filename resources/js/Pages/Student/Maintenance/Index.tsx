// File: resources/js/Pages/Student/Maintenance/Index.tsx
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ChevronRight, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MaintenanceRow {
  id: number;
  subject: string;
  hostel_name: string;
  room_number: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

interface AllocationContext {
  hostel_name: string;
  room_number: string;
}

interface Term {
  name: string;
}

interface Props {
  requests: MaintenanceRow[];
  allocation?: AllocationContext | null;
  currentTerm?: Term | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenanceIndex({ requests, allocation, currentTerm }: Props) {
  return (
    <AuthenticatedLayout
      title="Maintenance Requests"
      breadcrumbs={[
        { label: 'Maintenance', href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title="Maintenance Requests – Housing@UMU" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground">
              Maintenance Requests
            </h1>
            {allocation && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {allocation.hostel_name} · Room {allocation.room_number}
              </p>
            )}
          </div>
          <Button asChild size="sm" className="bg-brand-700 hover:bg-brand-800 text-white">
            <Link
              href={route('student.maintenance.create')}
              title="Submit a new maintenance request"
            >
              <Plus className="size-3.5 mr-1.5" /> New Request
            </Link>
          </Button>
        </div>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="size-4 text-accent-500" />
              All Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <Wrench className="size-10 text-muted-foreground/30" strokeWidth={1} />
                <p className="text-sm font-medium text-muted-foreground">
                  No maintenance requests yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Report a room or facility issue to get it resolved.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={route('student.maintenance.create')}>Submit a Request</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requests.map((req) => (
                  <Link
                    key={req.id}
                    href={route('student.maintenance.show', req.id)}
                    className="flex items-center justify-between px-4 py-4 hover:bg-muted/40 transition-colors group"
                    title={`View maintenance request: ${req.subject}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {req.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.hostel_name} · Room {req.room_number}
                        {' · '}
                        {new Date(req.created_at).toLocaleDateString('en-UG', {
                          day: 'numeric', month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={`text-[10px] px-2 py-0.5 ${
                          PRIORITY_COLORS[req.priority] ?? ''
                        }`}
                      >
                        {req.priority}
                      </Badge>
                      <StatusPill status={req.status} />
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AuthenticatedLayout>
  );
}
