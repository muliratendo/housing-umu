<?php
// app/Models/Bed.php — NEW FILE

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $room_id
 * @property string $label
 * @property string $status available|occupied|reserved|maintenance|inactive
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Allocation> $allocations
 * @property-read int|null $allocations_count
 * @property-read string $status_label
 * @property-read \App\Models\Room|null $room
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bed whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Bed extends Model
{
    use HasFactory;
    use SoftDeletes;

    // ── Status constants ──────────────────────────────────────────────────────

    public const STATUS_AVAILABLE    = 'available';
    public const STATUS_OCCUPIED     = 'occupied';
    public const STATUS_RESERVED     = 'reserved';
    public const STATUS_MAINTENANCE  = 'maintenance';
    public const STATUS_INACTIVE     = 'inactive';

    public const STATUSES = [
        self::STATUS_AVAILABLE,
        self::STATUS_OCCUPIED,
        self::STATUS_RESERVED,
        self::STATUS_MAINTENANCE,
        self::STATUS_INACTIVE,
    ];

    public const STATUS_LABELS = [
        self::STATUS_AVAILABLE   => 'Available',
        self::STATUS_OCCUPIED    => 'Occupied',
        self::STATUS_RESERVED    => 'Reserved',
        self::STATUS_MAINTENANCE => 'Under Maintenance',
        self::STATUS_INACTIVE    => 'Inactive',
    ];

    // ── Fillable ──────────────────────────────────────────────────────────────

    protected $fillable = [
        'room_id',
        'label',
        'status',
        'sort_order',
    ];

    // ── Casts ────────────────────────────────────────────────────────────────

    protected $casts = [
        'sort_order' => 'integer',
    ];

    // ── Appended accessors ───────────────────────────────────────────────────

    protected $appends = ['status_label'];

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst($this->status);
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    /**
     * The bed's current occupant, if any — a single-row relation (not the
     * full allocation history like allocations()) used by
     * RoomController::beds(), which only needs "who's in this bed right now".
     *
     * NOTE: this assumes 'checked_in' is the only status that counts as
     * "currently occupying" the bed, matching the same status string already
     * used in RoomController::adminRoomShape()
     * (->where('status', 'checked_in')->first()). If your Allocation status
     * enum also has something like 'confirmed' or 'reserved' that should
     * count as actively holding the bed before check-in, add it to the
     * whereIn list below — check app/Models/Allocation.php's status
     * constants to confirm the full set.
     */
    public function activeAllocation(): HasOne
    {
        return $this->hasOne(Allocation::class)
            ->whereIn('status', ['checked_in'])
            ->latestOfMany();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isOccupied(): bool
    {
        return $this->status === self::STATUS_OCCUPIED;
    }

    public function isAvailable(): bool
    {
        return $this->status === self::STATUS_AVAILABLE;
    }
}
