<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Allocation extends Model
{
    protected $fillable = [
        'student_id',
        'bed_id',
        'semester_id',
        'status',
        'allocated_at',
        'checked_in_at',
        'checked_out_at',
    ];

    protected $casts = [
        'student_id' => 'integer',
        'bed_id' => 'integer',
        'semester_id' => 'integer',
        'allocated_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
    ];

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
