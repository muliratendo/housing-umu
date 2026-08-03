// File: resources/js/Pages/Student/Application/Index.tsx
// NEW: page now renders two sections — auto-saved Drafts (resumable or
// deletable) and Submitted Applications (withdrawable if pending/
// waitlisted, re-submittable if withdrawn). Mirrors the same action logic
// used on Application/Show.tsx, just applied per-row instead of per-detail.
import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ClipboardList, ChevronRight, FileEdit, Plus, RotateCcw, Trash2 } from 'lucide-react';
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
  // NEW: per-row lifecycle flags, mirrored from Application model helpers
  can_be_withdrawn: boolean;
  can_be_resubmitted: boolean;
}

// NEW: shape of an auto-saved, never-submitted draft
interface DraftRow {
  id: number;
  form_id: string;
  hostel_name?: string | null;
  room_type?: string | null;
  last_saved_at?: string | null;
}

interface Term {
  name: string;
  academic_year: string;
}

interface Props {
  applications: ApplicationRow[];
  drafts: DraftRow[]; // NEW
  currentTerm: Term | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplicationIndex({ applications, drafts, currentTerm }: Props) {
  // NEW: withdraw a submitted, pending/waitlisted application — row stays,
  // only status flips to 'withdrawn' server-side.
  const handleWithdraw = (id: number) => {
    if (!confirm('Withdraw this application? You can re-submit it later.')) return;
    router.post(route('student.applications.withdraw', id));
  };

  // NEW: re-submit a previously withdrawn application.
  const handleResubmit = (id: number) => {
    router.post(route('student.applications.resubmit', id));
  };

  // NEW: soft-delete an auto-saved draft — never permitted on a submitted application.
  const handleDeleteDraft = (id: number) => {
    if (!confirm('Delete this draft? This cannot be undone from your side.')) return;
    router.delete(route('student.applications.draft.destroy', id));
  };

  return (
    <AuthenticatedLayout
      title="My Applications"
      breadcrumbs={[
        { label: 'Dashboard', href: route('student.dashboard') },
        { label: 'Applications' },
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

        {/* ── NEW: Drafts section — only rendered when at least one exists ──── */}
        {drafts.length > 0 && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileEdit className="size-4 text-accent-500" />
                Saved Drafts ({drafts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between px-4 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {draft.hostel_name ?? 'Untitled application'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {draft.room_type?.replace('-', ' ') ?? 'Category not chosen'}
                        {draft.last_saved_at && ` · Saved ${draft.last_saved_at}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* NEW: resume — redirects back into the Create form with this draft's state */}
                      <Button asChild size="sm" variant="outline">
                        <Link href={route('student.applications.resume', draft.id)}>
                          Resume
                        </Link>
                      </Button>
                      {/* NEW: delete — soft-deletes the draft row, never a hard delete */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteDraft(draft.id)}
                        aria-label="Delete draft"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Submitted applications ─────────────────────────────────────────── */}
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
                  <div
                    key={app.id}
                    className="flex items-center justify-between px-4 py-4 hover:bg-muted/40 transition-colors group"
                  >
                    <Link
                      href={route('student.applications.show', app.id)}
                      className="flex-1 min-w-0"
                      title={`View application to ${app.hostel_name}`}
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {app.hostel_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {app.term_name} · {app.academic_year}
                        {' · '}
                        <span className="capitalize">{app.hostel_type.replace('-', ' ')}</span>
                      </p>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* NEW: withdraw — only shown for pending/waitlisted applications */}
                      {app.can_be_withdrawn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleWithdraw(app.id)}
                        >
                          Withdraw
                        </Button>
                      )}
                      {/* NEW: resubmit — only shown for withdrawn applications */}
                      {app.can_be_resubmitted && (
                        <Button
                          size="sm"
                          className="bg-brand-700 hover:bg-brand-800 text-white"
                          onClick={() => handleResubmit(app.id)}
                        >
                          <RotateCcw className="size-3.5 mr-1" /> Re-submit
                        </Button>
                      )}
                      <StatusPill
                        status={app.status}
                        waitlistPosition={app.waitlist_position}
                      />
                      <Link href={route('student.applications.show', app.id)}>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AuthenticatedLayout>
  );
}
