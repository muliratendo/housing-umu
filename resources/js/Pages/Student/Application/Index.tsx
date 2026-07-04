// File: resources/js/Pages/Student/Application/Index.tsx
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ClipboardList, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApplicationRow {
  id: number;
  hostel_name: string;
  hostel_type: string;
  term_name: string;
  academic_year: string;
  status: string;
  waitlist_position?: number | null;
}

interface Term {
  name: string;
  academic_year: string;
}

interface Props {
  applications: ApplicationRow[];
  currentTerm: Term | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicationIndex({ applications, currentTerm }: Props) {
  return (
    <AuthenticatedLayout
      title="My Applications"
      breadcrumbs={[
        { label: 'Applications', href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title="My Applications – Housing@UMU" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground">My Applications</h1>
            {currentTerm && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentTerm.name} · {currentTerm.academic_year}
              </p>
            )}
          </div>
          <Button asChild size="sm" className="bg-brand-700 hover:bg-brand-800 text-white">
            <Link href={route('student.hostels.index')} title="Browse hostels to apply">
              <Plus className="size-3.5 mr-1.5" /> New Application
            </Link>
          </Button>
        </div>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="size-4 text-accent-500" />
              Applications ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {applications.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <ClipboardList className="size-10 text-muted-foreground/30" strokeWidth={1} />
                <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
                <Button asChild size="sm" variant="outline">
                  <Link href={route('student.hostels.index')}>Browse Hostels</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={route('student.applications.show', app.id)}
                    className="flex items-center justify-between px-4 py-4 hover:bg-muted/40 transition-colors group"
                    title={`View application to ${app.hostel_name}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {app.hostel_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {app.term_name} · {app.academic_year}
                        {' · '}
                        <span className="capitalize">{app.hostel_type.replace('-', ' ')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusPill
                        status={app.status}
                        waitlistPosition={app.waitlist_position}
                      />
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
