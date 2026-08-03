<?php
// File: app/Models/MaintenanceRequest.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $student_id
 * @property int $allocation_id
 * @property int $hostel_id
 * @property int $room_id
 * @property int $academic_term_id
 * @property string $subject
 * @property string $description
 * @property string $status
 * @property string $priority
 * @property \Illuminate\Support\Carbon|null $resolved_at
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property int|null $resolved_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AcademicTerm $academicTerm
 * @property-read \App\Models\Allocation $allocation
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceComment> $comments
 * @property-read int|null $comments_count
 * @property-read \App\Models\Hostel|null $hostel
 * @property-read \App\Models\Room|null $room
 * @property-read \App\Models\Student $student
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereAcademicTermId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereAllocationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereClosedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereHostelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereResolvedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereResolvedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereStudentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereSubject($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceRequest whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class MaintenanceRequest extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'student_id', 'allocation_id', 'hostel_id', 'room_id',
        'academic_term_id', 'subject', 'description',
        'status', 'priority', 'resolved_at', 'closed_at', 'resolved_by',
    ];

    protected $casts = ['resolved_at' => 'datetime', 'closed_at' => 'datetime'];

    const STATUS_OPEN        = 'open';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_RESOLVED    = 'resolved';
    const STATUS_CLOSED      = 'closed';

    public function student(): BelongsTo    { return $this->belongsTo(Student::class); }
    public function allocation(): BelongsTo { return $this->belongsTo(Allocation::class); }
    public function hostel(): BelongsTo     { return $this->belongsTo(Hostel::class); }
    public function room(): BelongsTo       { return $this->belongsTo(Room::class); }
    public function academicTerm(): BelongsTo { return $this->belongsTo(AcademicTerm::class); }
    public function comments(): HasMany     { return $this->hasMany(MaintenanceComment::class); }
}
