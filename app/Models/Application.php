<?php
// File: app/Models/Application.php
namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $form_id UUID for auto-save
 * @property int $student_id
 * @property int $hostel_id
 * @property int $academic_term_id
 * @property int|null $preferred_room_id
 * @property string $status
 * @property int|null $waitlist_position
 * @property array<array-key, mixed>|null $preferences
 * @property string|null $notes
 * @property string|null $special_needs
 * @property bool $dean_permission_granted
 * @property bool $warden_permission_granted
 * @property string|null $permission_notes
 * @property \Illuminate\Support\Carbon|null $permission_granted_at
 * @property int|null $permission_granted_by
 * @property array<array-key, mixed>|null $draft_data Auto-saved form state
 * @property \Illuminate\Support\Carbon|null $last_saved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
* @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $preferredRooms
 * @property-read \App\Models\AcademicTerm $academicTerm
 * @property-read \App\Models\Allocation|null $allocation
 * @property-read \App\Models\Hostel|null $hostel
 * @property-read \App\Models\Room|null $preferredRoom
 * @property-read \App\Models\Student $student
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application forTerm(int $termId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereAcademicTermId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereDeanPermissionGranted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereDraftData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereFormId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereHostelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereLastSavedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application wherePermissionGrantedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application wherePermissionGrantedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application wherePermissionNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application wherePreferences($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application wherePreferredRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereSpecialNeeds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereStudentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereWaitlistPosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Application whereWardenPermissionGranted($value)
 * @mixin \Eloquent
 */

/**
 * NEW: many-to-many preferred rooms, replacing the flat preferred_room_id
 * for the storefront application flow — see application_preferred_room
 * pivot table.
 */
class Application extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'form_id', 'student_id', 'hostel_id', 'academic_term_id',
        'preferred_room_id', 'status', 'waitlist_position',
        'room_type', 'capacity', // must be present — otherwise mass-assignment silently ignores them
        'preferences', 'notes', 'special_needs',
        'dean_permission_granted', 'warden_permission_granted',
        'permission_notes', 'permission_granted_at', 'permission_granted_by',
        'draft_data', 'last_saved_at', 'is_draft',
    ];

    protected $casts = [
        'preferences'               => 'array',
        'draft_data'                => 'array',
        'capacity'                  => 'integer', // NEW
        'dean_permission_granted'   => 'boolean',
        'warden_permission_granted' => 'boolean',
        'permission_granted_at'     => 'datetime',
        'last_saved_at'             => 'datetime',
        'is_draft'                  => 'boolean',
    ];

    const STATUS_PENDING     = 'pending';
    const STATUS_ALLOCATED   = 'allocated';
    const STATUS_WAITLISTED  = 'waitlisted';
    const STATUS_REJECTED    = 'rejected';
    const STATUS_WITHDRAWN   = 'withdrawn';
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

    /**
     * NEW: up to MAX_PREFERRED_ROOMS rooms the student flagged as preferred
     * on the application form, ordered by priority (1 = first choice /
     * primary). Backed by application_preferred_room pivot table — this is
     * what ApplicationController::show() and store() already expect to
     * exist via ->load(['preferredRooms']) and ->preferredRooms.
     */
    public function preferredRooms(): BelongsToMany
    {
        return $this->belongsToMany(Room::class, 'application_preferred_room')
            ->withPivot(['priority', 'is_primary'])
            ->withTimestamps()
            ->orderBy('application_preferred_room.priority');
    }

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

    // NEW: auto-saved, never formally submitted — resumable or deletable.
    public function scopeDrafts($query)
    {
        return $query->where('is_draft', true);
    }

    // NEW: formally submitted via store() — resumable actions differ
    // (withdraw/edit/resubmit instead of resume/delete).
    public function scopeSubmitted($query)
    {
        return $query->where('is_draft', false);
    }

    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING, self::STATUS_ALLOCATED,
            self::STATUS_WAITLISTED, self::STATUS_CHECKED_IN,
        ]);
    }

    // NEW: true only for a never-submitted, auto-saved application.
    public function isDraft(): bool
    {
        return (bool) $this->is_draft;
    }

    // NEW: true once the student has pulled back a submitted application.
    public function isWithdrawn(): bool
    {
        return $this->status === self::STATUS_WITHDRAWN;
    }

    // NEW: a submitted application can be withdrawn only while it's still
    // in a "pending decision" state — once allocated, rejected, or
    // checked in/out, withdrawing no longer makes sense.
    public function canBeWithdrawn(): bool
    {
        return ! $this->is_draft
            && in_array($this->status, [self::STATUS_PENDING, self::STATUS_WAITLISTED]);
    }

    // NEW: only a withdrawn application can be re-submitted.
    public function canBeResubmitted(): bool
    {
        return ! $this->is_draft && $this->status === self::STATUS_WITHDRAWN;
    }

    // NEW: editable while still a draft, or while pending/withdrawn — locked
    // once a decision (allocated/rejected/checked in/out) has been made.
    public function canBeEdited(): bool
    {
        return $this->is_draft
            || in_array($this->status, [self::STATUS_PENDING, self::STATUS_WITHDRAWN]);
    }

    /**
     * Apply admin-role scoping to the allocation query.
     * This local scope is used to make sure each admin only sees allocations
     * they are responsible for, even if a controller forgets to add the
     * hostels filter manually.
     */
    public function scopeScopeByAdminRole(Builder $query, User $user): Builder
    {
        if ($user->hasAnyRole(['super_admin', 'admin', 'dean'])) {
            return $query;
        }
        if ($user->hasRole('warden')) {
            return $query->whereHas('hostel', fn ($q) => $q->where('management_type', 'campus-managed'));
        }
        if ($user->hasRole('affiliated_admin')) {
            return $query->whereHas('hostel', fn ($q) => $q->where('management_type', 'affiliated'));
        }
        return $query;
    }
}
