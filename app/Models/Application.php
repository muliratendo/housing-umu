<?php
// File: app/Models/Application.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Application extends Model
{
    protected $fillable = [
        'form_id', 'student_id', 'hostel_id', 'academic_term_id',
        'preferred_room_id', 'status', 'waitlist_position',
        'preferences', 'notes', 'special_needs',
        'dean_permission_granted', 'warden_permission_granted',
        'permission_notes', 'permission_granted_at', 'permission_granted_by',
        'draft_data', 'last_saved_at',
    ];

    protected $casts = [
        'preferences'               => 'array',
        'draft_data'                => 'array',
        'dean_permission_granted'   => 'boolean',
        'warden_permission_granted' => 'boolean',
        'permission_granted_at'     => 'datetime',
        'last_saved_at'             => 'datetime',
    ];

    const STATUS_PENDING     = 'pending';
    const STATUS_ALLOCATED   = 'allocated';
    const STATUS_WAITLISTED  = 'waitlisted';
    const STATUS_REJECTED    = 'rejected';
    const STATUS_CHECKED_IN  = 'checked_in';
    const STATUS_CHECKED_OUT = 'checked_out';

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->form_id)) {
                $model->form_id = (string) Str::uuid();
            }
        });
    }

    public function student(): BelongsTo      { return $this->belongsTo(Student::class); }
    public function hostel(): BelongsTo       { return $this->belongsTo(Hostel::class); }
    public function academicTerm(): BelongsTo { return $this->belongsTo(AcademicTerm::class); }
    public function preferredRoom(): BelongsTo{ return $this->belongsTo(Room::class, 'preferred_room_id'); }
    public function allocation(): HasOne      { return $this->hasOne(Allocation::class); }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING, self::STATUS_ALLOCATED,
            self::STATUS_WAITLISTED, self::STATUS_CHECKED_IN,
        ]);
    }

    public function scopeForTerm($query, int $termId)
    {
        return $query->where('academic_term_id', $termId);
    }

    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING, self::STATUS_ALLOCATED,
            self::STATUS_WAITLISTED, self::STATUS_CHECKED_IN,
        ]);
    }
}
