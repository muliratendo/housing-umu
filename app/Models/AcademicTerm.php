<?php
// File: app/Models/AcademicTerm.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class AcademicTerm extends Model
{
    protected $fillable = [
        'academic_year_id', 'name', 'semester', 'start_date', 'end_date',
        'application_window_open', 'application_window_close', 'is_current',
    ];

    protected $casts = [
        'start_date'              => 'date',
        'end_date'                => 'date',
        'application_window_open' => 'date',
        'application_window_close'=> 'date',
        'is_current'              => 'boolean',
    ];

    public function academicYear(): BelongsTo { return $this->belongsTo(AcademicYear::class); }
    public function applications(): HasMany   { return $this->hasMany(Application::class); }
    public function allocations(): HasMany    { return $this->hasMany(Allocation::class); }

    public static function current(): ?self
    {
        return static::where('is_current', true)->with('academicYear')->first();
    }

    /** BR-6: Check if application window is open for this term. */
    public function isApplicationWindowOpen(): bool
    {
        $today = Carbon::today();
        if ($this->application_window_open && $this->application_window_close) {
            return $today->betweenIncluded(
                $this->application_window_open,
                $this->application_window_close
            );
        }
        return false;
    }

    public function hasEnded(): bool
    {
        return Carbon::today()->gt($this->end_date);
    }
}
