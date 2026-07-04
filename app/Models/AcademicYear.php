<?php
// File: app/Models/AcademicYear.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicYear extends Model
{
    protected $fillable = ['label', 'start_date', 'end_date', 'is_current'];
    protected $casts = ['start_date' => 'date', 'end_date' => 'date', 'is_current' => 'boolean'];

    public function terms(): HasMany { return $this->hasMany(AcademicTerm::class); }

    public static function current(): ?self
    {
        return static::where('is_current', true)->first();
    }
}
