<?php
// File: app/Policies/StudentPolicy.php

declare(strict_types=1);

namespace App\Policies;

use App\Models\{Student, User};
use Illuminate\Auth\Access\HandlesAuthorization;

class StudentPolicy
{
    use HandlesAuthorization;

    /**
     * Gate for accessing the student index/listing screen at all.
     * Object-level scoping (which specific students appear) is enforced
     * per-record by view() below, not here.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view students');
    }

    /**
     * Object-level visibility for a single student record.
     * Baseline 'view students' permission is necessary but not sufficient —
     * affiliated admins and wardens must only see students who are
     * currently allocated to, or have applied to, a hostel they manage.
     * Deans and super admins see everyone (needed for verification duties).
     */
    public function view(User $user, Student $student): bool
    {
        if (! $user->can('view students')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        // A student can always view their own profile record.
        if ($user->id === $student->user_id) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $this->hasStudentInManagedHostels($user, $student);
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->hasStudentInOwnedHostel($user, $student);
        }

        // student_leader: scoped to students who share an allocation/hostel,
        // e.g. peer-support duties — never full directory access.
        if ($user->hasRole('student_leader')) {
            return $this->sharesHostelWithLeader($user, $student);
        }

        return false;
    }

    /**
     * Verification is a Dean-only action per business rule (BR: registrar
     * verification gate before a student can apply/be allocated).
     */
    public function verify(User $user, Student $student): bool
    {
        return $user->can('verify students') && $user->hasAnyRole(['dean', 'admin', 'super_admin']);
    }

    /**
     * Update: same hostel-scoping logic as view(), but tighter — student
     * leaders can never update another student's record.
     */
    public function update(User $user, Student $student): bool
    {
        if (! $user->can('update students')) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'dean'])) {
            return true;
        }

        if ($user->id === $student->user_id) {
            return true;
        }

        if ($user->hasRole('warden')) {
            return $this->hasStudentInManagedHostels($user, $student);
        }

        if ($user->hasRole('affiliated_admin')) {
            return $this->hasStudentInOwnedHostel($user, $student);
        }

        return false;
    }

    /**
     * True if the student has an active/checked-in allocation, or a
     * pending/waitlisted application, in any hostel the warden manages.
     */
    private function hasStudentInManagedHostels(User $user, Student $student): bool
    {
        $managedHostelIds = $user->managedHostels()->pluck('hostels.id');

        if ($managedHostelIds->isEmpty()) {
            return false;
        }

        return $student->allocations()
            ->whereIn('hostel_id', $managedHostelIds)
            ->whereIn('status', ['allocated', 'checked_in'])
            ->exists()
            || $student->applications()
                ->whereIn('hostel_id', $managedHostelIds)
                ->exists();
    }

    /**
     * Same as above but scoped to the single hostel an affiliated admin
     * owns (or their managedHostels() pivot, if they manage more than one).
     */
    private function hasStudentInOwnedHostel(User $user, Student $student): bool
    {
        $ownedHostelIds = collect();

        if (isset($user->hostel_id)) {
            $ownedHostelIds->push($user->hostel_id);
        }

        if (method_exists($user, 'managedHostels')) {
            $ownedHostelIds = $ownedHostelIds->merge($user->managedHostels()->pluck('hostels.id'));
        }

        $ownedHostelIds = $ownedHostelIds->filter()->unique();

        if ($ownedHostelIds->isEmpty()) {
            return false;
        }

        return $student->allocations()
            ->whereIn('hostel_id', $ownedHostelIds)
            ->whereIn('status', ['allocated', 'checked_in'])
            ->exists()
            || $student->applications()
                ->whereIn('hostel_id', $ownedHostelIds)
                ->exists();
    }

    /**
     * A student_leader may view a peer only if both are (or were) allocated
     * to the same hostel in the same term — prevents leaders from browsing
     * the entire student directory.
     */
    private function sharesHostelWithLeader(User $user, Student $student): bool
    {
        $leaderStudent = $user->student;

        if (! $leaderStudent) {
            return false;
        }

        $leaderHostelIds = $leaderStudent->allocations()
            ->whereIn('status', ['allocated', 'checked_in'])
            ->pluck('hostel_id');

        if ($leaderHostelIds->isEmpty()) {
            return false;
        }

        return $student->allocations()
            ->whereIn('hostel_id', $leaderHostelIds)
            ->whereIn('status', ['allocated', 'checked_in'])
            ->exists();
    }
}
