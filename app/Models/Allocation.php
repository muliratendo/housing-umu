<?php
// File: app/Models/Allocation.php  — REPLACE existing.
// Fixes applied:
//  1. Added is_retained, retention_notes, is_admin_override, admin_notes,
//     override_by, retained_by, checked_in_at, checked_out_at to $fillable
//  2. Added is_retained, is_admin_override casts
//  3. canAccessMaintenance() added (referenced by AllocationController)

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
 * @property int $application_id
 * @property int $student_id
 * @property int $hostel_id
 * @property int|null $room_id
 * @property int|null $bed_id
 * @property int $academic_term_id
 * @property int $bed_number
 * @property string $status
 * @property bool $is_retained
 * @property int|null $retained_by
 * @property string|null $retention_notes
 * @property bool $is_admin_override
 * @property string|null $admin_notes
 * @property int|null $override_by
 * @property \Illuminate\Support\Carbon|null $checked_in_at
 * @property \Illuminate\Support\Carbon|null $checked_out_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AcademicTerm $academicTerm
 * @property-read \App\Models\Application $application
 * @property-read \App\Models\Bed|null $bed
 * @property-read array $admin_room_snapshot
 * @property-read array $student_room_snapshot
 * @property-read \App\Models\Hostel|null $hostel
 * @property-read \App\Models\User|null $overrideBy
 * @property-read \App\Models\User|null $retainedBy
 * @property-read \App\Models\Room|null $room
 * @property-read \App\Models\Student $student
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereAcademicTermId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereAdminNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereApplicationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereBedId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereBedNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereCheckedInAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereCheckedOutAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereHostelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereIsAdminOverride($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereIsRetained($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereOverrideBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereRetainedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereRetentionNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereStudentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Allocation whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Allocation extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'application_id',
        'student_id',
        'hostel_id',
        'room_id',
        'bed_id',
        'academic_term_id',
        'bed_number',
        'status',
        'is_retained',
        'retained_by',
        'retention_notes',
        'is_admin_override',
        'admin_notes',
        'override_by',
        'checked_in_at',
        'checked_out_at',
    ];

    protected $casts = [
        'bed_number'         => 'integer',
        'is_retained'        => 'boolean',
        'is_admin_override'  => 'boolean',
        'checked_in_at'      => 'datetime',
        'checked_out_at'     => 'datetime',
    ];

    // ─── Status constants ────────────────────────────────────────────────────
    public const STATUS_ALLOCATED   = 'allocated';
    public const STATUS_CHECKED_IN  = 'checked_in';
    public const STATUS_CHECKED_OUT = 'checked_out';
    public const STATUS_EVICTED     = 'evicted';
    public const STATUS_CANCELLED   = 'cancelled';

    // ─── Relationships ───────────────────────────────────────────────────────
    public function student(): BelongsTo      { return $this->belongsTo(Student::class); }
    public function hostel(): BelongsTo       { return $this->belongsTo(Hostel::class); }
    public function room(): BelongsTo         { return $this->belongsTo(Room::class); }
    public function bed(): BelongsTo          { return $this->belongsTo(Bed::class); }
    public function academicTerm(): BelongsTo { return $this->belongsTo(AcademicTerm::class); }
    public function application(): BelongsTo  { return $this->belongsTo(Application::class); }

    public function retainedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'retained_by');
    }

    public function overrideBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'override_by');
    }

    // ─── Computed attributes ─────────────────────────────────────────────────

    /**
     * Student-facing snapshot: hostel, room name/type, bed label, price.
     * room_number intentionally excluded (admin-only).
     */
    public function getStudentRoomSnapshotAttribute(): array
    {
        if (! $this->room) {
            return [];
        }

        return [
            'hostel_name'               => $this->hostel?->name,
            'hostel_slug'               => $this->hostel?->slug,
            'room_name'                 => $this->room->name,
            'room_type'                 => $this->room->room_type,
            'room_type_label'           => $this->room->room_type_label ?? null,
            'bed_label'                 => $this->bed?->label,
            'price_per_semester'        => $this->room->price_per_semester,
            'price_per_bed'             => $this->room->price_per_bed ?? null,
            'gender_scope_label'        => $this->room->gender_scope_label ?? null,
            'availability_status_label' => $this->room->availability_status_label ?? null,
        ];
    }

    /**
     * Admin snapshot: includes room_number, room_id, bed_id.
     */
    public function getAdminRoomSnapshotAttribute(): array
    {
        return array_merge($this->student_room_snapshot, [
            'room_number' => $this->room?->room_number,
            'bed_id'      => $this->bed_id,
            'room_id'     => $this->room_id,
        ]);
    }

    // ─── Business rules ──────────────────────────────────────────────────────

    /**
     * BR-7: Only allocated allocations can be checked in.
     */
    public function checkIn(): void
    {
        if ($this->status !== self::STATUS_ALLOCATED) {
            throw new \RuntimeException('BR-7: Only allocated allocations can be checked in.');
        }

        $this->update([
            'status'        => self::STATUS_CHECKED_IN,
            'checked_in_at' => now(),
        ]);

        $this->bed?->update(['status' => Bed::STATUS_OCCUPIED]);
    }

    /**
     * BR-8: Only checked-in allocations can be checked out.
     */
    public function checkOut(): void
    {
        if ($this->status !== self::STATUS_CHECKED_IN) {
            throw new \RuntimeException('BR-8: Only checked-in allocations can be checked out.');
        }

        $this->update([
            'status'         => self::STATUS_CHECKED_OUT,
            'checked_out_at' => now(),
        ]);

        $this->bed?->update(['status' => Bed::STATUS_AVAILABLE]);
        $this->room?->syncAvailability();
    }

    /**
     * A student can submit maintenance requests only while checked in.
     * Referenced by AllocationController::show().
     */
    public function canAccessMaintenance(): bool
    {
        return $this->status === self::STATUS_CHECKED_IN;
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
