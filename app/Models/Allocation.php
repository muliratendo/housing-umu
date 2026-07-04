<?php
// File: app/Models/Allocation.php  REPLACE existing.
// getStudentRoomSnapshotAttribute() — room_number intentionally excluded.
// Admins use getAdminRoomSnapshotAttribute() which includes room_number.
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Allocation extends Model {
    protected $fillable = [
        'student_id','hostel_id','room_id','bed_id','academic_term_id',
        'status','waitlist_position','admin_notes','checked_in_at','checked_out_at',
    ];
    protected $casts = ['waitlist_position'=>'integer','checked_in_at'=>'datetime','checked_out_at'=>'datetime'];

    public const STATUS_PENDING     = 'pending';
    public const STATUS_WAITLISTED  = 'waitlisted';
    public const STATUS_ALLOCATED   = 'allocated';
    public const STATUS_CHECKED_IN  = 'checked_in';
    public const STATUS_CHECKED_OUT = 'checked_out';
    public const STATUS_REJECTED    = 'rejected';
    public const STATUS_EVICTED     = 'evicted';

    public function student(): BelongsTo  { return $this->belongsTo(Student::class); }
    public function hostel(): BelongsTo   { return $this->belongsTo(Hostel::class); }
    public function room(): BelongsTo     { return $this->belongsTo(Room::class); }
    public function bed(): BelongsTo      { return $this->belongsTo(Bed::class); }
    public function academicTerm(): BelongsTo { return $this->belongsTo(AcademicTerm::class); }

    /** Student-facing snapshot: hostel, room name/type, bed label, price. room_number NEVER shown. */
    public function getStudentRoomSnapshotAttribute(): array {
        if (!$this->room) return [];
        return [
            'hostel_name'               => $this->hostel?->name,
            'hostel_slug'               => $this->hostel?->slug,
            'room_name'                 => $this->room->name,
            'room_type'                 => $this->room->room_type,
            'room_type_label'           => $this->room->room_type_label,
            'bed_label'                 => $this->bed?->label,
            'price_per_semester'        => $this->room->price_per_semester,
            'price_per_bed'             => $this->room->price_per_bed,
            'gender_scope_label'        => $this->room->gender_scope_label,
            'availability_status_label' => $this->room->availability_status_label,
        ];
    }
    /** Admin snapshot: includes room_number, room_id, bed_id. */
    public function getAdminRoomSnapshotAttribute(): array {
        return array_merge($this->student_room_snapshot, [
            'room_number' => $this->room?->room_number,
            'bed_id'      => $this->bed_id,
            'room_id'     => $this->room_id,
        ]);
    }

    /** BR-7 guard. */
    public function checkIn(): void {
        if ($this->status !== self::STATUS_ALLOCATED)
            throw new \RuntimeException('BR-7: Only allocated allocations can be checked in.');
        $this->update(['status'=>self::STATUS_CHECKED_IN,'checked_in_at'=>now()]);
        $this->bed?->update(['status'=>Bed::STATUS_OCCUPIED]);
    }
    /** BR-8 guard. */
    public function checkOut(): void {
        if ($this->status !== self::STATUS_CHECKED_IN)
            throw new \RuntimeException('BR-8: Only checked-in allocations can be checked out.');
        $this->update(['status'=>self::STATUS_CHECKED_OUT,'checked_out_at'=>now()]);
        $this->bed?->update(['status'=>Bed::STATUS_AVAILABLE]);
        $this->room?->syncAvailability();
    }
}
