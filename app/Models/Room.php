<?php
// File: app/Models/Room.php  REPLACE existing.
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo,HasMany};
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model {
    use SoftDeletes;
    protected $fillable = [
        'hostel_id','name','slug','room_number','room_type','capacity','bed_count','is_active',
        'price_per_semester','availability_status','gender_scope','description','amenities','image_url',
    ];
    protected $casts = [
        'amenities'          => 'array',
        'capacity'           => 'integer',
        'bed_count'          => 'integer',
        'price_per_semester' => 'integer',
        'is_active'          => 'boolean',
    ];

    public const ROOM_TYPE_NON_SC    = 'non-self-contained';
    public const ROOM_TYPE_SC        = 'self-contained';
    public const ROOM_TYPE_APARTMENT = 'apartment';
    public const STATUS_AVAILABLE   = 'available';
    public const STATUS_LIMITED     = 'limited';
    public const STATUS_FULL        = 'full';
    public const STATUS_MAINTENANCE = 'maintenance';
    public const STATUS_CLOSED      = 'closed';

    public function hostel(): BelongsTo { return $this->belongsTo(Hostel::class); }
    public function beds(): HasMany { return $this->hasMany(Bed::class)->orderBy('sort_order'); }
    public function allocations(): HasMany { return $this->hasMany(Allocation::class); }

    public function getRoomTypeLabelAttribute(): string {
        return match($this->room_type) {
            self::ROOM_TYPE_SC=>'Self-Contained', self::ROOM_TYPE_APARTMENT=>'Apartment', default=>'Non-Self-Contained'
        };
    }
    public function getBedCountLabelAttribute(): string {
        return $this->capacity === 1 ? 'Single Occupancy' : 'Double Occupancy';
    }
    public function getAvailabilityStatusLabelAttribute(): string {
        return match($this->availability_status) {
            self::STATUS_LIMITED=>'Limited', self::STATUS_FULL=>'Full',
            self::STATUS_MAINTENANCE=>'Under Maintenance', self::STATUS_CLOSED=>'Closed', default=>'Available'
        };
    }
    public function getGenderScopeLabelAttribute(): string {
        return match($this->gender_scope ?? $this->hostel?->gender_scope) {
            'male'=>'Male Only','female'=>'Female Only',default=>'Mixed'
        };
    }
    /** Price per individual bed. Single = price_per_semester. Double = price/2. */
    public function getPricePerBedAttribute(): int {
        return $this->capacity > 1 ? (int) round($this->price_per_semester / $this->capacity) : $this->price_per_semester;
    }
    /** Create/deactivate bed rows to match capacity. Called by admin toggle. */
    public function syncBeds(): void {
        $existing = $this->beds()->pluck('label')->toArray();
        $labels   = $this->capacity === 1 ? ['A'] : ['A','B'];
        foreach ($labels as $i => $label) {
            if (!in_array($label, $existing, true)) {
                $this->beds()->create(['label'=>$label,'status'=>Bed::STATUS_AVAILABLE,'sort_order'=>$i]);
            }
        }
        $this->beds()->whereNotIn('label',$labels)
            ->whereNotIn('status',[Bed::STATUS_OCCUPIED,Bed::STATUS_RESERVED])
            ->update(['status'=>Bed::STATUS_INACTIVE]);
        $this->update(['bed_count'=>count($labels)]);
    }
    /** Derive and cache availability_status from live bed statuses. */
    public function syncAvailability(): void {
        $beds      = $this->beds()->get();
        $total     = $beds->count();
        $available = $beds->where('status',Bed::STATUS_AVAILABLE)->count();
        $status = match(true) {
            $available === 0 => self::STATUS_FULL,
            $available < $total => self::STATUS_LIMITED,
            default => self::STATUS_AVAILABLE,
        };
        $this->update(['availability_status'=>$status]);
    }
}
