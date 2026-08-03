<?php
// File: app/Models/Student.php  — REPLACE existing.
// Fix applied:
//  canApplyToAffiliatedHostel() used $q->where('hostel_type', ...) which
//  hits a non-existent column.  Changed to where('management_type', ...).
//  The hostel_type ACCESSOR on Hostel handles reads; DB queries must use
//  the real column name.

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $user_id
 * @property string $student_number
 * @property string|null $registration_number
 * @property string $gender
 * @property int $year_of_study
 * @property string|null $programme
 * @property string|null $faculty
 * @property \Illuminate\Support\Carbon|null $enrollment_date
 * @property int|null $current_academic_year_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Allocation> $allocations
 * @property-read int|null $allocations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Application> $applications
 * @property-read int|null $applications_count
 * @property-read \App\Models\AcademicYear|null $currentAcademicYear
 * @property-read bool $is_first_year
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRequest> $maintenanceRequests
 * @property-read int|null $maintenance_requests_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student firstYear()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereCurrentAcademicYearId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereEnrollmentDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereFaculty($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereGender($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereProgramme($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereRegistrationNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereStudentNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Student whereYearOfStudy($value)
 * @mixin \Eloquent
 */
class Student extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'student_number', 'registration_number',
        'gender', 'year_of_study', 'programme', 'faculty',
        'enrollment_date', 'current_academic_year_id',
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'year_of_study' => 'integer',
    ];

    // ─── Relationships ───────────────────────────────────────────────────────
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function currentAcademicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'current_academic_year_id');
    }

    public function applications(): HasMany { return $this->hasMany(Application::class); }
    public function allocations(): HasMany { return $this->hasMany(Allocation::class); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class); }

    public function verifiedStudentRecord(): HasOne
    {
        return $this->hasOne(VerifiedStudentRecord::class, 'user_id', 'user_id');
    }

    // ─── Accessors / scopes ──────────────────────────────────────────────────

    /** BR enforcement: first-year priority. */
    public function getIsFirstYearAttribute(): bool
    {
        return $this->year_of_study === 1;
    }

    public function scopeFirstYear($query)
    {
        return $query->where('year_of_study', 1);
    }

    // ─── Helper methods ──────────────────────────────────────────────────────
    public function activeAllocationForTerm(int $termId): ?Allocation
    {
        return $this->allocations()
            ->whereIn('status', ['allocated', 'checked_in'])
            ->where('academic_term_id', $termId)
            ->with(['hostel', 'room'])
            ->first();
    }

    public function applicationForHostel(int $hostelId, int $termId): ?Application
    {
        return $this->applications()
            ->where('hostel_id', $hostelId)
            ->where('academic_term_id', $termId)
            ->first();
    }

    public function canApplyToAffiliatedHostel(int $termId): bool
    {
        $hasCampusAllocation = $this->allocations()
            ->whereIn('status', ['allocated', 'checked_in'])
            ->where('academic_term_id', $termId)
            ->whereHas('hostel', fn ($q) => $q->where('management_type', Hostel::TYPE_CAMPUS))
            ->exists();

        return ! $hasCampusAllocation;
    }
}
