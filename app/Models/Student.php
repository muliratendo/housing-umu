<?php
// File: app/Models/Student.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    protected $fillable = [
        'user_id', 'student_number', 'registration_number',
        'gender', 'year_of_study', 'programme', 'faculty',
        'enrollment_date', 'current_academic_year_id',
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'year_of_study'   => 'integer',
    ];

    public function user(): BelongsTo           { return $this->belongsTo(User::class); }
    public function currentAcademicYear(): BelongsTo { return $this->belongsTo(AcademicYear::class, 'current_academic_year_id'); }
    public function applications(): HasMany      { return $this->hasMany(Application::class); }
    public function allocations(): HasMany       { return $this->hasMany(Allocation::class); }
    public function maintenanceRequests(): HasMany { return $this->hasMany(MaintenanceRequest::class); }

    /** BR enforcement: first-year priority */
    public function getIsFirstYearAttribute(): bool
    {
        return $this->year_of_study === 1;
    }

    public function scopeFirstYear($query) { return $query->where('year_of_study', 1); }

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
            ->whereHas('hostel', fn($q) => $q->where('hostel_type', 'campus-managed'))
            ->exists();

        return !$hasCampusAllocation;
    }
}
