<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerifiedStudentRecord extends Model
{
    protected $fillable = [
        'reg_number', 'student_email', 'contact', 'first_name',
        'last_name', 'faculty', 'course', 'gender', 'user_id'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
