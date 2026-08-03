<?php
// File: app/Models/AcademicTerm.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $academic_year_id
 * @property string $name
 * @property string $semester
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property bool $is_current
 * @property Carbon|null $application_window_open
 * @property Carbon|null $application_window_close
 * @property-read bool $is_application_window_open
 * @mixin \Eloquent
 */
class AcademicTerm extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'academic_year_id', 'name', 'semester', 'start_date', 'end_date',
        'application_window_open', 'application_window_close', 'is_current',
    ];

    protected $casts = [
        'start_date'               => 'date',
        'end_date'                 => 'date',
        'application_window_open'  => 'date',
        'application_window_close' => 'date',
        'is_current'               => 'boolean',
    ];

    // FIX (root cause of "application window always closed"): the model
    // stored application_window_open/close as real columns and had an
    // isApplicationWindowOpen() METHOD, but nothing ever exposed a
    // serialized `is_application_window_open` ATTRIBUTE. Eloquent only
    // serializes real columns plus anything listed in $appends — a plain
    // method is invisible to JSON/Inertia serialization. So
    // AcademicTermController::index() was sending
    // `is_application_window_open: undefined` to Index.tsx on every
    // single request, regardless of what dates were actually saved, and
    // the frontend's badge check `t.is_application_window_open ? 'Open' :
    // 'Closed'` is always falsy for `undefined` — hence "always closed"
    // no matter what the admin did in the dialog. Adding the accessor +
    // $appends entry is what actually fixes this; nothing on the frontend
    // needed to change for this part.
    protected $appends = ['is_application_window_open'];

    public function getIsApplicationWindowOpenAttribute(): bool
    {
        return $this->isApplicationWindowOpen();
    }

    public function academicYear(): BelongsTo { return $this->belongsTo(AcademicYear::class); }
    public function applications(): HasMany   { return $this->hasMany(Application::class); }
    public function allocations(): HasMany    { return $this->hasMany(Allocation::class); }

    public static function current(): ?self
    {
        return static::where('is_current', true)->with('academicYear')->first();
    }

    /**
     * BR-6: Check if application window is open for this term.
     *
     * FIX: previously store()/update() forced application_window_open to
     * ALWAYS equal start_date, so an admin could never open applications
     * before the term itself started even though this method's date
     * comparison never required that — the restriction was purely in the
     * controller's translation logic, not here. This method itself
     * already supports application_window_open being any date, including
     * one before start_date; the controller fix below is what actually
     * unlocks that.
     */
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
