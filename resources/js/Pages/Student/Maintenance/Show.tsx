// File: resources/js/Pages/Student/Maintenance/Show.tsx
import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  ChevronLeft, Edit2, MessageSquare, Send, Trash2, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusPill from '@/components/Student/StatusPill';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Comment {
  id: number;
  body: string;
  author_name: string;
  is_mine: boolean;
  created_at: string;
  updated_at?: string;
}

interface MaintenanceRequestDetail {
  id: number;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  hostel_name: string;
  room_number: string;
  created_at: string;
  resolved_at?: string;
  comments: Comment[];
}

interface Props {
  maintenanceRequest: MaintenanceRequestDetail;
}

interface CommentFormData {
  body: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenanceShow({ maintenanceRequest }: Props) {
  const req = maintenanceRequest;

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const commentForm = useForm<CommentFormData>({ body: '' });

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    commentForm.post(route('student.maintenance.comments.store', req.id), {
      onSuccess: () => commentForm.reset(),
    });
  };

  const submitEdit = (commentId: number) => {
    router.patch(
      route('student.maintenance.comments.update', commentId),
      { body: editBody },
      { onSuccess: () => setEditingCommentId(null) }
    );
  };

  const confirmDelete = (commentId: number) => {
    router.delete(route('student.maintenance.comments.destroy', commentId), {
      onSuccess: () => setDeleteTargetId(null),
    });
  };

  return (
    <AuthenticatedLayout
      title="Maintenance Request"
      breadcrumbs={[
        { label: 'Maintenance', href: route('student.maintenance.index') },
        { label: req.subject, href: '' },
        { label: '', href: '' },
      ]}
    >
      <Head title={`Maintenance – ${req.subject}`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        <Link
          href={route('student.maintenance.index')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back to Maintenance
        </Link>

        {/* ── Request Details ──────────────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-accent-500" />
                <CardTitle className="text-sm font-semibold">{req.subject}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] px-2 py-0.5 ${PRIORITY_COLORS[req.priority]}`}>
                  {req.priority}
                </Badge>
                <StatusPill status={req.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Hostel</p>
                <p className="font-medium">{req.hostel_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="font-medium">{req.room_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {new Date(req.created_at).toLocaleDateString('en-UG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              {req.resolved_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="font-medium">
                    {new Date(req.resolved_at).toLocaleDateString('en-UG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="whitespace-pre-wrap text-foreground/90">{req.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Comments ────────────────────────────────────────────────────── */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-accent-500" />
              Comments ({req.comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Comment list */}
            {req.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No comments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {req.comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString('en-UG', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Inline edit */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-brand-700 hover:bg-brand-800 text-white text-xs"
                            onClick={() => submitEdit(comment.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground/80 whitespace-pre-wrap">{comment.body}</p>
                    )}

                    {/* My comment actions */}
                    {comment.is_mine && editingCommentId !== comment.id && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditBody(comment.body);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          title="Edit your comment"
                        >
                          <Edit2 className="size-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(comment.id)}
                          className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                          title="Delete your comment"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add comment form */}
            <form onSubmit={submitComment} className="flex gap-2 pt-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentForm.data.body}
                onChange={(e) => commentForm.setData('body', e.target.value)}
                rows={2}
                className="flex-1 resize-none text-sm"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={commentForm.processing}
                className="bg-brand-700 hover:bg-brand-800 text-white self-end"
                title="Post comment"
              >
                <Send className="size-4" />
              </Button>
            </form>
            {commentForm.errors.body && (
              <p className="text-xs text-destructive">{commentForm.errors.body}</p>
            )}
          </CardContent>
        </Card>

        {/* ── Delete confirmation dialog ───────────────────────────────────── */}
        <Dialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Comment</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => deleteTargetId !== null && confirmDelete(deleteTargetId)}
              >
                <Trash2 className="size-4 mr-2" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AuthenticatedLayout>
  );
}
