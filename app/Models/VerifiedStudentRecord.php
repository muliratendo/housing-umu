<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $reg_number
 * @property string|null $student_email
 * @property string|null $contact
 * @property string $first_name
 * @property string $last_name
 * @property string $faculty
 * @property string $course
 * @property string $gender
 * @property int|null $user_id
 * @property-read string $full_name
 * @property-read \App\Models\User|null $user
 */
class VerifiedStudentRecord extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'verified_student_records';

    protected $fillable = [
        'reg_number',
        'student_email',
        'contact',
        'first_name',
        'last_name',
        'faculty',
        'course',
        'gender',
        'user_id',
        'matched_by',
        'matched_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'matched_by' => 'integer',
        'matched_at' => 'datetime',
    ];

    /**
     * Convenience accessor: "First Last" used in UI and exports.
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Relationship to the linked User (if any).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship to manage audits for Admin changes.
     */
    public function matchedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'matched_by');
    }

    /**
     * Scope: records not yet linked to a user.
     */
    public function scopeUnmatched(Builder $query): Builder
    {
        return $query->whereNull('user_id');
    }

    /**
     * Scope: records already linked to a user.
     */
    public function scopeMatched(Builder $query): Builder
    {
        return $query->whereNotNull('user_id');
    }

    /**
     * Optional helper scope for search by reg number, email, or name.
     * (Useful if you want to centralise the logic used in StudentController@verification.)
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $q->where('reg_number', 'like', "%{$term}%")
                ->orWhere('student_email', 'like', "%{$term}%")
                ->orWhere('first_name', 'like', "%{$term}%")
                ->orWhere('last_name', 'like', "%{$term}%");
        });
    }
}
