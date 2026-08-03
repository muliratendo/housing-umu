<?php
// File: app/Models/AcademicYear.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name e.g. 2025/2026
 * @property int $start_year
 * @property int $end_year
 * @property string $label e.g. 2025/2026
 * @property \Illuminate\Support\Carbon $start_date
 * @property \Illuminate\Support\Carbon $end_date
 * @property bool $is_current
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AcademicTerm> $terms
 * @property-read int|null $terms_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereIsCurrent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AcademicYear whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AcademicYear extends Model
{
    use HasFactory;
    use SoftDeletes;

    // FIX: fillable/casts previously only listed label/start_date/end_date.
    // The AcademicTermController queries name/start_year/end_year directly
    // (::get(['id','name','start_year','end_year'])), and the frontend
    // Select renders y.name — but nothing could ever WRITE those three
    // columns because they were missing from $fillable. Any attempt to
    // AcademicYear::create()/update() with those keys silently dropped
    // them, which is the root cause of the "buggy academic year selector":
    // newly created academic years always showed a blank/undefined name in
    // the dropdown even though start_year/end_year existed in the DB.
    protected $fillable = ['name', 'start_year', 'end_year', 'label', 'start_date', 'end_date', 'is_current'];

    protected $casts = [
        'start_year' => 'integer',
        'end_year'   => 'integer',
        'start_date' => 'date',
        'end_date'   => 'date',
        'is_current' => 'boolean',
    ];

    public function terms(): HasMany { return $this->hasMany(AcademicTerm::class); }

    public static function current(): ?self
    {
        return static::where('is_current', true)->first();
    }
}
