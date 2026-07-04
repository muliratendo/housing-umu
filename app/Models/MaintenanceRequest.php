<?php
// File: app/Models/MaintenanceRequest.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceRequest extends Model
{
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
