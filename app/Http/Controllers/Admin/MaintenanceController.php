<?php
// app/Http/Controllers/Admin/MaintenanceController.php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hostel;
use App\Models\MaintenanceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceController extends Controller
{
    private const STATUS_CYCLE = ['open', 'in_progress', 'resolved', 'closed'];

    /** A8 — Maintenance List | GET /admin/maintenance */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', MaintenanceRequest::class);

        /** @var \App\Models\User $admin */
        $admin = auth()->user();

        $query = MaintenanceRequest::query()
            ->with([
                'student.user:id,name,email',
                'room.hostel:id,name,slug,management_type',
            ])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->priority, fn ($q, $v) => $q->where('priority', $v))
            ->when($request->hostel_id, fn ($q, $v) => $q->whereHas('room', fn ($r) => $r->where('hostel_id', $v)))
            ->when($request->search, fn ($q, $v) => $q->where(function ($sub) use ($v) {
                $sub->where('subject', 'like', "%{$v}%")
                    ->orWhere('description', 'like', "%{$v}%")
                    ->orWhereHas('student.user', fn ($u) => $u->where('name', 'like', "%{$v}%"));
            }));

        if ($admin->hasRole('warden') && ! $admin->hasAnyRole(['super_admin', 'admin', 'dean'])) {
            $query->whereHas('room.hostel', fn ($q) => $q->where('management_type', 'campus-managed'));
        } elseif ($admin->hasRole('affiliated_admin') && ! $admin->hasAnyRole(['super_admin', 'admin', 'dean'])) {
            $query->whereHas('room.hostel', fn ($q) => $q->where('management_type', 'affiliated'));
        }

        $requests = $query
            ->orderByRaw("FIELD(status,'open','in_progress','resolved','closed')")
            ->orderByRaw("FIELD(priority,'urgent','high','medium','low')")
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString();

        $hostels = Hostel::query()
            ->select('id', 'name', 'management_type')
            ->when(
                $admin->hasRole('warden') && ! $admin->hasAnyRole(['super_admin', 'admin', 'dean']),
                fn ($q) => $q->where('management_type', 'campus-managed')
            )
            ->when(
                $admin->hasRole('affiliated_admin') && ! $admin->hasAnyRole(['super_admin', 'admin', 'dean']),
                fn ($q) => $q->where('management_type', 'affiliated')
            )
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Maintenance/Index', [
            'requests'   => $requests,
            'hostels'    => $hostels,
            'filters'    => $request->only(['status', 'priority', 'hostel_id', 'search']),
            'statuses'   => self::STATUS_CYCLE,
            'priorities' => ['low', 'medium', 'high', 'urgent'],
        ]);
    }

    /** A8b — Maintenance Detail | GET /admin/maintenance/{maintenanceRequest} */
    public function show(MaintenanceRequest $maintenanceRequest): Response
    {
        $this->authorize('view', $maintenanceRequest);

        // FIX: root cause of RelationNotFoundException — "Call to undefined
        // relationship [student] on model [App\Models\MaintenanceComment]".
        // MaintenanceComment only defines maintenanceRequest() and user()
        // (belongsTo User::class, via 'user_id'). It has no student_id
        // column and no student() relation at all — that relationship
        // belongs to MaintenanceRequest, not MaintenanceComment. The old
        // eager-load chain incorrectly nested 'student.user' under
        // 'comments', which Eloquent tried to resolve against
        // MaintenanceComment and failed outright.
        //
        // Fix: eager-load 'comments.user:id,name,email' instead, matching
        // MaintenanceComment's actual schema/relations.
        $maintenanceRequest->load([
            'student.user:id,name,email',
            'room.hostel:id,name,slug,management_type,campus_location',
            'comments' => fn ($q) => $q->latest()->with([
                'user:id,name,email',
            ]),
        ]);

        return Inertia::render('Admin/Maintenance/Show', [
            'maintenanceRequest' => [
                'id' => $maintenanceRequest->id,
                'subject' => $maintenanceRequest->subject,
                'description' => $maintenanceRequest->description,
                'priority' => $maintenanceRequest->priority,
                'status' => $maintenanceRequest->status,
                'created_at' => optional($maintenanceRequest->created_at)?->toDateTimeString(),
                'updated_at' => optional($maintenanceRequest->updated_at)?->toDateTimeString(),
                'resolved_at' => optional($maintenanceRequest->resolved_at)?->toDateTimeString(),
                'student' => $maintenanceRequest->student ? [
                    'id' => $maintenanceRequest->student->id,
                    'student_number' => $maintenanceRequest->student->student_number,
                    'gender' => $maintenanceRequest->student->gender,
                    'year_of_study' => $maintenanceRequest->student->year_of_study,
                    'programme' => $maintenanceRequest->student->programme,
                    'user' => $maintenanceRequest->student->user ? [
                        'id' => $maintenanceRequest->student->user->id,
                        'name' => $maintenanceRequest->student->user->name,
                        'email' => $maintenanceRequest->student->user->email,
                    ] : null,
                ] : null,
                'room' => $maintenanceRequest->room ? [
                    'id' => $maintenanceRequest->room->id,
                    'name' => $maintenanceRequest->room->name,
                    'room_number' => $maintenanceRequest->room->room_number,
                    'room_type' => $maintenanceRequest->room->room_type,
                    'hostel' => $maintenanceRequest->room->hostel ? [
                        'id' => $maintenanceRequest->room->hostel->id,
                        'name' => $maintenanceRequest->room->hostel->name,
                        'slug' => $maintenanceRequest->room->hostel->slug,
                        'management_type' => $maintenanceRequest->room->hostel->management_type,
                        'campus_location' => $maintenanceRequest->room->hostel->campus_location,
                    ] : null,
                ] : null,
                // FIX: mapping updated to match MaintenanceComment's real
                // columns — 'is_internal' (not 'is_admin') and the 'user'
                // relation (not 'student'). Frontend prop key kept as
                // 'is_admin' for backward compatibility with the existing
                // Show.tsx component, but now sourced from the correct
                // 'is_internal' database column.
                'comments' => $maintenanceRequest->comments->map(fn ($comment) => [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'is_admin' => (bool) $comment->is_internal,
                    'created_at' => optional($comment->created_at)?->toDateTimeString(),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                    ] : null,
                ])->values(),
            ],
            'statuses' => self::STATUS_CYCLE,
            'can' => [
                'update' => auth()->user()->can('update maintenance'),
            ],
        ]);
    }

    /** ASYS-7 — Update Status | PATCH /admin/maintenance/{maintenanceRequest}/update-status */
    public function updateStatus(Request $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $this->authorize('update', $maintenanceRequest);

        $validated = $request->validate([
            'status' => 'required|in:open,in_progress,resolved,closed',
            'admin_note' => 'nullable|string|max:2000',
        ]);

        $allowed = match ($maintenanceRequest->status) {
            'open' => ['in_progress'],
            'in_progress' => ['resolved'],
            'resolved' => ['closed', 'in_progress'],
            'closed' => ['open'],
            default => [],
        };

        abort_unless(in_array($validated['status'], $allowed, true), 422, 'Invalid status transition.');

        if (in_array($validated['status'], ['closed'], true) ||
            ($maintenanceRequest->status === 'closed' && $validated['status'] === 'open')) {
            $request->validate(['admin_note' => 'required|string|min:5']);
        }

        $old = $maintenanceRequest->status;

        $maintenanceRequest->update([
            'status' => $request->string('status')->toString(),
            'resolved_at' => in_array($request->status, ['resolved', 'closed'], true)
                ? now()
                : $maintenanceRequest->resolved_at,
        ]);

        if ($request->filled('admin_note')) {
            // FIX: MaintenanceComment's $fillable is
            // ['maintenance_request_id', 'user_id', 'body', 'is_internal'].
            // There is no 'student_id' or 'is_admin' column on this table
            // at all — the old code was silently relying on mass-assignment
            // dropping unknown keys, which meant every admin note was saved
            // with a NULL user_id (unattributed) and 'is_internal' left at
            // its default (false), making admin notes indistinguishable
            // from student comments. Fixed to use the real columns and
            // attribute the note to the acting admin.
            $maintenanceRequest->comments()->create([
                'user_id' => auth()->id(),
                'body' => "[Admin] {$request->admin_note}",
                'is_internal' => true,
            ]);
        }

        activity()
            ->causedBy(auth()->user())
            ->performedOn($maintenanceRequest)
            ->withProperties([
                'old' => $old,
                'new' => $request->status,
            ])
            ->log('admin_maintenance_status_update');

        return back()->with('success', "Request #{$maintenanceRequest->id} moved to {$request->status}.");
    }
}
