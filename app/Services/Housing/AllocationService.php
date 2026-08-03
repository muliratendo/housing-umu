<?php

declare(strict_types=1);

namespace App\Services\Housing;

use App\Models\AcademicTerm;
use App\Models\Allocation;
use App\Models\Application;
use App\Models\Bed;
use App\Models\Hostel;
use App\Models\Room;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AllocationService
{
    /**
     * Create an allocation for a student if a compatible bed exists,
     * otherwise move the application to the waitlist.
     *
     * @param array<string, mixed> $context
     */
    public function create(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        array $context = []
    ): Allocation|Application {
        return DB::transaction(function () use ($student, $hostel, $term, $context) {
            $application = isset($context['application_id'])
                ? Application::query()
                    ->with(['preferredRoom'])
                    ->lockForUpdate()
                    ->find($context['application_id'])
                : null;

            $this->ensureNoActiveAllocation($student, $term, $application);
            $this->ensureGenderCompatibility($student, $hostel);
            $this->ensureFirstYearAffiliatedPolicy($student, $hostel, $term, $application);

            // NEW: manual allocation from the admin dialog can pin a specific
            // bed_id directly (the student picked a room off the list, or the
            // admin picked one on their behalf) — this bypasses the
            // preference-based search entirely and validates that exact bed.
            $bed = isset($context['bed_id']) && $context['bed_id']
                ? $this->resolveSpecificBed($student, $hostel, $term, (int) $context['bed_id'])
                : $this->resolveAvailableBed(
                    $student,
                    $hostel,
                    $term,
                    $application,
                    // NEW: include_other_types — when true, "Random" selection
                    // is allowed to pick a bed outside the application's own
                    // room_type category. Defaults to false so random
                    // allocation always respects what the student applied for.
                    (bool) ($context['include_other_types'] ?? false)
                );

            if (! $bed) {
                return $this->moveToWaitlist($student, $hostel, $term, $application);
            }

            return $this->createAllocation($student, $hostel, $term, $bed, $application);
        });
    }

    /**
     * NEW: validates and locks a specific admin-chosen bed. Returns null
     * (rather than throwing) if the bed turns out to be unavailable, wrong
     * hostel, inactive room, or gender-incompatible — the caller falls back
     * to moveToWaitlist() exactly as it would for a failed random search.
     */
    private function resolveSpecificBed(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        int $bedId
    ): ?Bed {
        $bed = Bed::query()
            ->where('id', $bedId)
            ->where('status', Bed::STATUS_AVAILABLE)
            ->whereDoesntHave('allocations', function ($query) use ($term) {
                $query->where('academic_term_id', $term->id)
                    ->whereIn('status', [
                        Allocation::STATUS_ALLOCATED,
                        Allocation::STATUS_CHECKED_IN,
                    ]);
            })
            ->lockForUpdate()
            ->first();

        if (! $bed) {
            return null;
        }

        $room = $bed->room()->firstOrFail();

        if ($room->hostel_id !== $hostel->id || ! $room->is_active) {
            return null;
        }

        if ($room->gender_scope && $room->gender_scope !== 'mixed' && $room->gender_scope !== $student->gender) {
            return null;
        }

        return $bed;
    }

    /**
     * NEW: returns every currently available bed for this hostel/term,
     * grouped into "matching" (same room_type as the application) and
     * "other" (every other category) — powers the admin allocation dialog's
     * room list, its default-to-application-category behaviour, and the
     * "view other room types" expansion. Uses non-locking reads since this
     * is a read-only listing, not the actual allocation transaction.
     */
    public function listAvailableBeds(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        ?string $applicationRoomType
    ): array {
        $rooms = Room::query()
            ->where('hostel_id', $hostel->id)
            ->where('is_active', true)
            ->where(function ($query) use ($student) {
                $query->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender);
            })
            ->orderBy('room_type')
            ->orderBy('room_number')
            ->get(['id', 'room_number', 'room_type', 'floor']);

        $grouped = ['matching' => [], 'other' => []];

        foreach ($rooms as $room) {
            $bed = $this->findAvailableBedInRoom($student, $hostel, $term, (int) $room->id, lock: false);

            if (! $bed) {
                continue;
            }

            $entry = [
                'bed_id'      => $bed->id,
                'bed_label'   => $bed->label,
                'room_id'     => $room->id,
                'room_number' => $room->room_number,
                'room_type'   => $room->room_type,
                'floor'       => $room->floor,
            ];

            if ($applicationRoomType && $room->room_type === $applicationRoomType) {
                $grouped['matching'][] = $entry;
            } else {
                $grouped['other'][] = $entry;
            }
        }

        return $grouped;
    }

    private function resolveAvailableBed(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        ?Application $application,
        bool $includeOtherTypes = false
    ): ?Bed {
        $preferredRoomId = $application?->preferred_room_id;

        if ($preferredRoomId) {
            $preferredBed = $this->findAvailableBedInRoom($student, $hostel, $term, (int) $preferredRoomId);

            if ($preferredBed) {
                return $preferredBed;
            }
        }

        // FIX: falls back to the application's own room_type column when
        // preferences->room_type wasn't set — keeps "random" allocation
        // aligned with the actual category the student applied for.
        $preferredType = data_get($application?->preferences, 'room_type') ?? $application?->room_type;
        $preferredFloor = data_get($application?->preferences, 'floor_pref')
            ?? data_get($application?->preferences, 'floorpref');

        $roomsQuery = Room::query()
            ->where('hostel_id', $hostel->id)
            ->where('is_active', true)
            ->where(function ($query) use ($student) {
                $query->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender);
            });

        // NEW: unless the admin explicitly toggled "include other room
        // types" on, random/default allocation stays confined to the
        // application's own category — never silently substitutes an
        // apartment for a standard room the student never asked for.
        if ($preferredType && ! $includeOtherTypes) {
            $roomsQuery->where('room_type', $preferredType);
        }

        $rooms = $roomsQuery
            ->when(
                $preferredType,
                fn ($query) => $query->orderByRaw('CASE WHEN room_type = ? THEN 0 ELSE 1 END', [$preferredType])
            )
            ->when(
                $preferredFloor,
                fn ($query) => $query->orderByRaw('CASE WHEN floor = ? THEN 0 ELSE 1 END', [$preferredFloor])
            )
            ->orderBy('room_number')
            ->get(['id']);

        foreach ($rooms as $room) {
            $bed = $this->findAvailableBedInRoom($student, $hostel, $term, (int) $room->id);

            if ($bed) {
                return $bed;
            }
        }

        return null;
    }

    private function findAvailableBedInRoom(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        int $roomId,
        bool $lock = true // NEW: listAvailableBeds() reads without locking
    ): ?Bed {
        $room = Room::query()
            ->where('id', $roomId)
            ->where('hostel_id', $hostel->id)
            ->where('is_active', true)
            ->where(function ($query) use ($student) {
                $query->whereNull('gender_scope')
                    ->orWhere('gender_scope', 'mixed')
                    ->orWhere('gender_scope', $student->gender);
            })
            ->first();

        if (! $room) {
            return null;
        }

        return Bed::query()
            ->where('room_id', $room->id)
            ->where('status', Bed::STATUS_AVAILABLE)
            ->whereDoesntHave('allocations', function ($query) use ($term) {
                $query->where('academic_term_id', $term->id)
                    ->whereIn('status', [
                        Allocation::STATUS_ALLOCATED,
                        Allocation::STATUS_CHECKED_IN,
                    ]);
            })
            ->orderBy('sort_order')
            ->orderBy('id')
            ->when($lock, fn ($query) => $query->lockForUpdate())
            ->first();
    }

    public function promoteNextWaitlisted(Hostel $hostel, AcademicTerm $term): Allocation|Application|null
    {
        return DB::transaction(function () use ($hostel, $term) {
            $application = Application::query()
                ->with(['student', 'hostel', 'academicTerm', 'preferredRoom'])
                ->where('hostel_id', $hostel->id)
                ->where('academic_term_id', $term->id)
                ->where('status', Application::STATUS_WAITLISTED)
                ->orderBy('waitlist_position')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $application) {
                return null;
            }

            return $this->create(
                $application->student,
                $hostel,
                $term,
                ['application_id' => $application->id]
            );
        });
    }

    public function promoteNextWaitlistedForAllocation(Allocation $allocation): Allocation|Application|null
    {
        $allocation->loadMissing(['hostel', 'academicTerm']);

        return $this->promoteNextWaitlisted($allocation->hostel, $allocation->academicTerm);
    }

    /**
     * NEW: cancels an allocation (rejection, withdrawal, or admin action).
     * Frees the bed, resequences the waitlist, and records the reason —
     * this is the ONLY place an allocation is ever cancelled, so rejection,
     * withdrawal, and any future cancellation path all funnel through here.
     */
    public function cancel(Allocation $allocation, string $reason): Allocation
    {
        return DB::transaction(function () use ($allocation, $reason) {
            $allocation->update([
                'status'      => Allocation::STATUS_CANCELLED,
                'admin_notes' => $reason,
            ]);

            $allocation->bed?->update(['status' => Bed::STATUS_AVAILABLE]);

            if (method_exists($allocation->room, 'syncAvailability')) {
                $allocation->room->syncAvailability();
            }

            $this->resequenceWaitlist($allocation->hostel, $allocation->academicTerm);

            return $allocation->refresh();
        });
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function ensureNoActiveAllocation(
        Student $student,
        AcademicTerm $term,
        ?Application $application = null
    ): void {
        $existing = Allocation::query()
            ->where('student_id', $student->id)
            ->where('academic_term_id', $term->id)
            ->whereIn('status', [
                Allocation::STATUS_ALLOCATED,
                Allocation::STATUS_CHECKED_IN,
            ])
            ->lockForUpdate()
            ->first();

        if (! $existing) {
            return;
        }

        if ($application && $application->allocation && $application->allocation->id === $existing->id) {
            return;
        }

        throw new RuntimeException('Student already has an active allocation for this academic term.');
    }

    private function ensureGenderCompatibility(Student $student, Hostel $hostel): void
    {
        if ($hostel->gender_scope !== 'mixed' && $hostel->gender_scope !== $student->gender) {
            throw new RuntimeException('Student gender is not compatible with the selected hostel.');
        }
    }

    private function ensureFirstYearAffiliatedPolicy(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        ?Application $application
    ): void {
        if ($hostel->management_type !== Hostel::TYPE_AFFILIATED || ! $student->is_first_year) {
            return;
        }

        $campusBedsAvailable = Hostel::query()
            ->where('management_type', Hostel::TYPE_CAMPUS)
            ->where('campus_location', Hostel::CAMPUS_ON)
            ->where('availability_status', '!=', 'closed')
            ->get()
            ->sum(fn (Hostel $item) => $item->availableBedCount($term->id));

        $hasApproval = (bool) ($application?->dean_permission_granted || $application?->warden_permission_granted);

        if ($campusBedsAvailable > 0 && ! $hasApproval) {
            throw new RuntimeException(
                'First-year students must first be considered for campus-managed hostels unless approval exists.'
            );
        }
    }

    private function createAllocation(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        Bed $bed,
        ?Application $application
    ): Allocation {
        $room = $bed->room()->firstOrFail();

        $allocation = Allocation::query()->create([
            'application_id' => $application?->id,
            'student_id' => $student->id,
            'hostel_id' => $hostel->id,
            'room_id' => $room->id,
            'bed_id' => $bed->id,
            'academic_term_id' => $term->id,
            'bed_number' => $this->resolveBedNumber($bed),
            'status' => Allocation::STATUS_ALLOCATED,
            'is_retained' => false,
            'is_admin_override' => false,
            'admin_notes' => null,
            'checked_in_at' => null,
            'checked_out_at' => null,
        ]);

        $bed->update([
            'status' => Bed::STATUS_OCCUPIED,
        ]);

        if (method_exists($room, 'syncAvailability')) {
            $room->syncAvailability();
        }

        if ($application) {
            $application->update([
                'status' => Application::STATUS_ALLOCATED,
                'waitlist_position' => null,
            ]);

            $this->resequenceWaitlist($hostel, $term);
        }

        return $allocation->load(['student.user', 'hostel', 'room', 'bed', 'academicTerm']);
    }

    private function moveToWaitlist(
        Student $student,
        Hostel $hostel,
        AcademicTerm $term,
        ?Application $application
    ): Application {
        $nextPosition = ((int) Application::query()
            ->where('hostel_id', $hostel->id)
            ->where('academic_term_id', $term->id)
            ->where('status', Application::STATUS_WAITLISTED)
            ->max('waitlist_position')) + 1;

        if ($application) {
            $application->update([
                'status' => Application::STATUS_WAITLISTED,
                'waitlist_position' => $nextPosition,
            ]);

            return $application->fresh(['student.user', 'hostel', 'academicTerm']);
        }

        return Application::query()->create([
            'student_id' => $student->id,
            'hostel_id' => $hostel->id,
            'academic_term_id' => $term->id,
            'status' => Application::STATUS_WAITLISTED,
            'waitlist_position' => $nextPosition,
            'form_id' => (string) str()->uuid(),
        ])->load(['student.user', 'hostel', 'academicTerm']);
    }

    private function resequenceWaitlist(Hostel $hostel, AcademicTerm $term): void
    {
        $items = Application::query()
            ->where('hostel_id', $hostel->id)
            ->where('academic_term_id', $term->id)
            ->where('status', Application::STATUS_WAITLISTED)
            ->orderBy('waitlist_position')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($items as $index => $item) {
            $position = $index + 1;

            if ((int) $item->waitlist_position !== $position) {
                $item->update(['waitlist_position' => $position]);
            }
        }
    }

    private function resolveBedNumber(Bed $bed): int
    {
        if (preg_match('/(\d+)/', $bed->label, $matches)) {
            return (int) $matches[1];
        }

        return max(1, (int) $bed->sort_order + 1);
    }
}
