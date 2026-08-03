<?php
// File: app/Services/Housing/ApplicationService.php
namespace App\Services\Housing;

use App\Models\{Application, AcademicTerm, Hostel, Student, Allocation};
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplicationService
{
    /**
     * Create a new application.
     * Enforces: BR-1, BR-2, BR-3, BR-6 + affiliated access rules.
     *
     * FIX: finalizes an EXISTING auto-saved draft in place when the
     * controller passes existing_application_id (resolved from the
     * request's form_id), instead of always inserting a brand-new row.
     * This is the single change that keeps "draft" and "submitted" as
     * ONE row's lifecycle rather than two disconnected records — a
     * submission is now always a finalize-in-place, never a parallel
     * insert. Drafting only ever happens automatically, pre-submission,
     * via saveDraft(); the moment store() runs, that draft ceases to
     * exist as a draft and becomes the permanent submitted record.
     *
     * @throws ValidationException
     */
    public function create(
        Student      $student,
        Hostel       $hostel,
        AcademicTerm $term,
        array        $data
    ): Application {
        return DB::transaction(function () use ($student, $hostel, $term, $data) {
            // BR-1: No active allocation this term
            $activeAllocation = Allocation::where('student_id', $student->id)
                ->where('academic_term_id', $term->id)
                ->whereIn('status', ['allocated', 'checked_in'])
                ->first();

            if ($activeAllocation) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'BR-1: You already have an active allocation this semester.',
                ]);
            }

            // BR-2: One application per student per hostel per term
            // FIX: excludes the draft row being finalized in THIS call from
            // its own uniqueness check — otherwise finalizing a draft would
            // always fail BR-2 by matching itself.
            $existing = Application::where('student_id', $student->id)
                ->where('hostel_id', $hostel->id)
                ->where('academic_term_id', $term->id)
                // FIX: exclude the draft being finalized in THIS call — otherwise
                // every submission fails BR-2 by matching its own autosaved draft.
                ->when(
                    ! empty($data['existing_application_id']),
                    fn ($q) => $q->where('id', '!=', $data['existing_application_id'])
                )
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'BR-2: You have already applied to this hostel this term.',
                ]);
            }

            // BR-6: Application window must be open
            if (! $hostel->isApplicationWindowOpen($term)) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'BR-6: The application window for this hostel is closed.',
                ]);
            }

            // BR-3: Gender must match
            $primaryPreferredRoomId = $data['preferred_room_id']
                ?? (array_values($data['preferred_room_ids'] ?? [])[0] ?? null);

            $effectiveGender = $primaryPreferredRoomId
                ? optional(\App\Models\Room::find($primaryPreferredRoomId))->effective_gender_policy
                : $hostel->gender_policy;

            if ($effectiveGender !== 'mixed' && $effectiveGender !== $student->gender) {
                throw ValidationException::withMessages([
                    'hostel_id' => "BR-3: Gender policy mismatch. This hostel is for [{$effectiveGender}] students.",
                ]);
            }

            // Affiliated hostel domain access checks
            if ($hostel->hostel_type === 'affiliated') {
                $this->validateAffiliatedAccess($student, $hostel, $term, $data);
            }

            // NEW: room_type/capacity persisted directly on the row.
            // NEW: preferences populated from room_type/floor_pref when
            // not explicitly supplied — this is the exact field
            // AllocationService::resolveAvailableBed() reads to sort
            // eligible rooms; it was always null before this fix.
            $attributes = [
                'student_id'        => $student->id,
                'hostel_id'         => $hostel->id,
                'academic_term_id'  => $term->id,
                'room_type'         => $data['room_type'] ?? null,
                'capacity'          => $data['capacity'] ?? null,
                'preferred_room_id' => $primaryPreferredRoomId,
                'notes'             => $data['notes'] ?? null,
                'preferences'       => $data['preferences'] ?? [
                    'room_type'  => $data['room_type'] ?? null,
                    'floor_pref' => $data['floor_pref'] ?? null,
                ],
                'special_needs'     => $data['special_needs'] ?? null,
                'status'            => Application::STATUS_PENDING,
                // FIX: explicitly flips is_draft to false on whichever row
                // ends up being written to — this is what was never set.
                'is_draft'          => false,
            ];

            // FIX: update the SAME row the draft already occupies, rather
            // than inserting a new Application. id, form_id, and
            // created_at are preserved; only content and is_draft/status
            // flip. This is the core fix for the orphaned-draft bug.
            if (! empty($data['existing_application_id'])) {
                $application = Application::where('id', $data['existing_application_id'])
                    ->where('student_id', $student->id) // defensive: never finalize another student's row
                    ->where('is_draft', true)            // defensive: never re-finalize an already-submitted row
                    ->firstOrFail();

                $application->update($attributes);
            } else {
                // Fallback: no matching draft was found (e.g. autosave
                // never fired before the student submitted) — behaves
                // exactly like a fresh insert always did.
                $application = Application::create($attributes);
            }

            // NEW: attach preferred rooms to the pivot table in priority order.
            if (! empty($data['preferred_room_ids'])) {
                $syncData = [];
                foreach (array_values($data['preferred_room_ids']) as $index => $roomId) {
                    $syncData[$roomId] = [
                        'priority'   => $index + 1,
                        'is_primary' => $index === 0,
                    ];
                }
                $application->preferredRooms()->sync($syncData);

                // NEW: mirror the primary choice onto the legacy
                // preferred_room_id column for backward compatibility.
                $application->update([
                    'preferred_room_id' => array_values($data['preferred_room_ids'])[0],
                ]);
            } else {
                // FIX: if the student had preferred rooms on an earlier
                // draft save but removed them all before final submit,
                // the pivot must be cleared too — otherwise stale pivot
                // rows would outlive the student's actual final choice.
                $application->preferredRooms()->sync([]);
            }

            return $application->refresh();
        });
    }

    /**
     * NEW: auto-save a draft's form state. This is the ONLY place a
     * draft is ever written — always automatic, always pre-submission.
     * Once create() finalizes a row (is_draft => false), this method
     * must never be allowed to write to that row again.
     */
    public function saveDraft(string $formId, array $draftData): void
    {
        // FIX: scoped to is_draft = true — refuses to silently no-op (or
        // worse, resurrect draft_data) on a row that has already been
        // submitted. Without this guard, a stray autosave firing after
        // navigation away from a just-submitted application could
        // overwrite last_saved_at on a finalized record.
        Application::where('form_id', $formId)
            ->where('is_draft', true)
            ->update([
                'draft_data'    => $draftData,
                'last_saved_at' => now(),
            ]);
    }

    /**
     * NEW: soft-delete an auto-saved draft the student never formally
     * submitted. Guarded to drafts only — a submitted application must go
     * through withdraw() instead, never delete(). Per requirement, this is
     * ALWAYS a soft delete (SoftDeletes trait on Application) — the row is
     * retained with deleted_at set, never purged.
     */
    public function deleteDraft(Application $application): void
    {
        if (! $application->is_draft) {
            throw ValidationException::withMessages([
                'application' => 'Only auto-saved drafts can be deleted. Submitted applications must be withdrawn instead.',
            ]);
        }

        $application->delete(); // soft delete via SoftDeletes trait
    }

    /**
     * NEW: withdraw a submitted application. The row is never deleted —
     * status flips to 'withdrawn' so it remains visible in the student's
     * history and can later be re-submitted via resubmit().
     */
    public function withdraw(Application $application): Application
    {
        if (! $application->canBeWithdrawn()) {
            throw ValidationException::withMessages([
                'application' => 'This application can no longer be withdrawn.',
            ]);
        }

        $application->update([
            'status'            => Application::STATUS_WITHDRAWN,
            'waitlist_position' => null,
        ]);

        return $application->refresh();
    }

    /**
     * NEW: re-submit a previously withdrawn application. Re-runs the same
     * business rules create() would enforce (BR-1 active allocation, BR-6
     * window open, BR-3 gender match) against the CURRENT term state,
     * since time has passed since the original withdrawal. Reuses the
     * same row/id rather than creating a new one — BR-2's unique index on
     * (student_id, hostel_id, academic_term_id) would otherwise conflict.
     */
    public function resubmit(Application $application): Application
    {
        return DB::transaction(function () use ($application) {
            if (! $application->canBeResubmitted()) {
                throw ValidationException::withMessages([
                    'application' => 'Only a withdrawn application can be re-submitted.',
                ]);
            }

            $student = $application->student;
            $hostel  = $application->hostel;
            $term    = $application->academicTerm;

            $activeAllocation = Allocation::where('student_id', $student->id)
                ->where('academic_term_id', $term->id)
                ->whereIn('status', ['allocated', 'checked_in'])
                ->first();

            if ($activeAllocation) {
                throw ValidationException::withMessages([
                    'application' => 'BR-1: You already have an active allocation this semester.',
                ]);
            }

            if (! $hostel->isApplicationWindowOpen($term)) {
                throw ValidationException::withMessages([
                    'application' => 'BR-6: The application window for this hostel is now closed.',
                ]);
            }

            $primaryPreferredRoomId = $application->preferredRooms->first()?->id
                ?? $application->preferred_room_id;

            $effectiveGender = $primaryPreferredRoomId
                ? optional(\App\Models\Room::find($primaryPreferredRoomId))->effective_gender_policy
                : $hostel->gender_policy;

            if ($effectiveGender !== 'mixed' && $effectiveGender !== $student->gender) {
                throw ValidationException::withMessages([
                    'application' => "BR-3: Gender policy mismatch. This hostel is for [{$effectiveGender}] students.",
                ]);
            }

            $application->update([
                'status'            => Application::STATUS_PENDING,
                'waitlist_position' => null,
            ]);

            return $application->refresh();
        });
    }

    /**
     * NEW: edit a draft, pending, or withdrawn application's details —
     * notes, preferences, special needs, room_type/capacity, and preferred
     * rooms. Locked once a decision has been made (allocated/rejected/
     * checked in/out) via Application::canBeEdited().
     */
    public function edit(Application $application, array $data): Application
    {
        return DB::transaction(function () use ($application, $data) {
            if (! $application->canBeEdited()) {
                throw ValidationException::withMessages([
                    'application' => 'This application can no longer be edited.',
                ]);
            }

            $application->update([
                'notes'         => $data['notes'] ?? $application->notes,
                'preferences'   => $data['preferences'] ?? $application->preferences,
                'special_needs' => $data['special_needs'] ?? $application->special_needs,
            ]);

            if (array_key_exists('preferred_room_ids', $data)) {
                $this->syncPreferredRooms($application, $data['preferred_room_ids'] ?? []);
            }

            return $application->refresh();
        });
    }

    /**
     * NEW: reject a submitted application. Cancels any linked allocation via
     * AllocationService rather than manipulating the Allocation model
     * directly here — application workflow must never touch allocation rows
     * except through AllocationService, per the single-source-of-truth rule.
     */
    public function reject(Application $application, string $reason): Application
    {
        return DB::transaction(function () use ($application, $reason) {
            $application->update([
                'status'            => Application::STATUS_REJECTED,
                'waitlist_position' => null,
                'permission_notes'  => $reason,
            ]);

            if ($application->allocation) {
                app(\App\Services\Housing\AllocationService::class)
                    ->cancel($application->allocation, "Application rejected: {$reason}");
            }

            return $application->refresh();
        });
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * NEW: shared helper — syncs the preferred_room pivot in priority order
     * (first = primary) and mirrors the primary choice onto the legacy
     * preferred_room_id column for backward compatibility with older
     * reports/exports that read that column directly.
     */
    private function syncPreferredRooms(Application $application, array $preferredRoomIds): void
    {
        $syncData = [];
        foreach (array_values($preferredRoomIds) as $index => $roomId) {
            $syncData[$roomId] = [
                'priority'   => $index + 1,
                'is_primary' => $index === 0,
            ];
        }
        $application->preferredRooms()->sync($syncData);

        $application->update([
            'preferred_room_id' => $syncData ? array_values($preferredRoomIds)[0] : null,
        ]);
    }

    private function validateAffiliatedAccess(
        Student $student, Hostel $hostel, AcademicTerm $term, array $data
    ): void {
        $campusBedsAvailable = Hostel::active()->campus()
            ->get()
            ->sum(fn ($h) => $h->availableBedCount($term->id));

        $hasDeanPermission   = $data['dean_permission_granted'] ?? false;
        $hasWardenPermission = $data['warden_permission_granted'] ?? false;

        if ($student->is_first_year && $campusBedsAvailable > 0) {
            if (! $hasDeanPermission && ! $hasWardenPermission) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'First-year students must apply to on-campus hostels first. Affiliated hostels require Dean or Warden approval while on-campus capacity is available.',
                ]);
            }
        }
    }
}
