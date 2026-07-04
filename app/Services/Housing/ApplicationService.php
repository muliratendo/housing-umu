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
            $existing = Application::where('student_id', $student->id)
                ->where('hostel_id', $hostel->id)
                ->where('academic_term_id', $term->id)
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'BR-2: You have already applied to this hostel this term.',
                ]);
            }

            // BR-6: Application window must be open
            if (!$hostel->isApplicationWindowOpen($term)) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'BR-6: The application window for this hostel is closed.',
                ]);
            }

            // BR-3: Gender must match
            $effectiveGender = $data['preferred_room_id']
                ? optional(\App\Models\Room::find($data['preferred_room_id']))->effective_gender_policy
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

            return Application::create([
                'student_id'        => $student->id,
                'hostel_id'         => $hostel->id,
                'academic_term_id'  => $term->id,
                'preferred_room_id' => $data['preferred_room_id'] ?? null,
                'notes'             => $data['notes'] ?? null,
                'preferences'       => $data['preferences'] ?? [],
                'special_needs'     => $data['special_needs'] ?? null,
                'status'            => Application::STATUS_PENDING,
            ]);
        });
    }

    public function saveDraft(string $formId, array $draftData): void
    {
        Application::where('form_id', $formId)->update([
            'draft_data'    => $draftData,
            'last_saved_at' => now(),
        ]);
    }

    private function validateAffiliatedAccess(
        Student $student, Hostel $hostel, AcademicTerm $term, array $data
    ): void {
        $campusBedsAvailable = Hostel::active()->campus()
            ->get()
            ->sum(fn($h) => $h->availableBedCount($term->id));

        $hasDeanPermission   = $data['dean_permission_granted'] ?? false;
        $hasWardenPermission = $data['warden_permission_granted'] ?? false;

        if ($student->is_first_year && $campusBedsAvailable > 0) {
            if (!$hasDeanPermission && !$hasWardenPermission) {
                throw ValidationException::withMessages([
                    'hostel_id' => 'First-year students must apply to on-campus hostels first. Affiliated hostels require Dean or Warden approval while on-campus capacity is available.',
                ]);
            }
        }
    }
}
