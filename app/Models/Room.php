<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property int $hostel_id
 * @property string $name
 * @property string $slug
 * @property string|null $room_number
 * @property string|null $floor
 * @property string $room_type
 * @property int $capacity
 * @property bool $is_active Soft-disable a room without deleting it
 * @property int $bed_count
 * @property int $price_per_semester
 * @property string $availability_status
 * @property string|null $gender_scope
 * @property string|null $description
 * @property array<array-key, mixed>|null $amenities
 * @property string|null $image_url
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Allocation> $allocations
 * @property-read int|null $allocations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Bed> $beds
 * @property-read int|null $beds_count
 * @property-read string $availability_status_label
 * @property-read string $bed_count_label
 * @property-read string $gender_scope_label
 * @property-read int $price_per_bed
 * @property-read string $room_type_label
 * @property-read \App\Models\Hostel|null $hostel
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereAmenities($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereAvailabilityStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereBedCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereFloor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereGenderScope($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereHostelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereImageUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room wherePricePerSemester($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereRoomNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereRoomType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room withoutTrashed()
 * @mixin \Eloquent
 */
class Room extends Model
{
    use HasFactory;
    use SoftDeletes;

    // ── Room-type constants (architectural type, matches UMU hostel terminology) ─
    public const ROOM_TYPE_NON_S    = 'standard';
    public const ROOM_TYPE_SC        = 'self-contained';
    public const ROOM_TYPE_APARTMENT = 'apartment';

    public const ROOM_TYPE_LABELS = [
        self::ROOM_TYPE_NON_S    => 'Standard',
        self::ROOM_TYPE_SC        => 'Self-Contained',
        self::ROOM_TYPE_APARTMENT => 'Apartment',
    ];

    // ── Availability-status constants ────────────────────────────────────────
    public const STATUS_AVAILABLE   = 'available';
    public const STATUS_LIMITED     = 'limited';
    public const STATUS_FULL        = 'full';
    public const STATUS_MAINTENANCE = 'maintenance';
    public const STATUS_CLOSED      = 'closed';
    public const STATUS_INACTIVE    = 'inactive';

    public const AVAILABILITY_LABELS = [
        self::STATUS_AVAILABLE   => 'Available',
        self::STATUS_LIMITED     => 'Limited',
        self::STATUS_FULL        => 'Full',
        self::STATUS_MAINTENANCE => 'Under Maintenance',
        self::STATUS_CLOSED      => 'Closed',
        self::STATUS_INACTIVE    => 'Inactive',
    ];

    // ── Gender-scope constants ───────────────────────────────────────────────
    public const GENDER_MALE   = 'male';
    public const GENDER_FEMALE = 'female';
    public const GENDER_MIXED  = 'mixed';

    protected $fillable = [
        'hostel_id', 'name', 'slug', 'room_number', 'room_type',
        'capacity', 'bed_count', 'is_active',
        'price_per_semester', 'availability_status', 'gender_scope',
        'description', 'amenities', 'image_url', 'floor', 'notes',
    ];

    protected $casts = [
        'amenities'          => 'array',
        'capacity'           => 'integer',
        'bed_count'          => 'integer',
        'price_per_semester' => 'integer',
        'is_active'          => 'boolean',
    ];

    protected $appends = [
        'room_type_label', 'availability_status_label',
        'gender_scope_label', 'bed_count_label', 'price_per_bed',
    ];

    public function hostel(): BelongsTo { return $this->belongsTo(Hostel::class); }
    public function beds(): HasMany { return $this->hasMany(Bed::class)->orderBy('sort_order'); }
    public function allocations(): HasMany { return $this->hasMany(Allocation::class); }

    public function getRoomTypeLabelAttribute(): string
    {
        return self::ROOM_TYPE_LABELS[$this->room_type] ?? ucfirst((string) $this->room_type);
    }

    public function getBedCountLabelAttribute(): string
    {
        return $this->capacity === 1 ? 'Single Occupancy' : 'Double Occupancy';
    }

    public function getAvailabilityStatusLabelAttribute(): string
    {
        return self::AVAILABILITY_LABELS[$this->availability_status] ?? ucfirst((string) $this->availability_status);
    }

    public function getGenderScopeLabelAttribute(): string
    {
        return match ($this->gender_scope ?? $this->hostel?->gender_scope) {
            self::GENDER_MALE   => 'Male Only',
            self::GENDER_FEMALE => 'Female Only',
            default             => 'Mixed',
        };
    }

    /** Price per individual bed, derived from price_per_semester / capacity (not stored). */
    public function getPricePerBedAttribute(): int
    {
        return $this->capacity > 1
            ? (int) round($this->price_per_semester / $this->capacity)
            : $this->price_per_semester;
    }

    /**
     * Create/deactivate bed rows to match current capacity.
     *
     * OPTIMIZED: previously issued one firstOrCreate() query PER bed label
     * (1-2 queries per room), plus a separate whereNotIn()->update() and a
     * final ->update() on the room itself — 3-4 queries per room. Across
     * ~200 seeded rooms that's 600-800+ round-trips, which on a
     * high-latency connection (e.g. Aiven free tier) is the single biggest
     * contributor to seeding slowness after RolePermissionSeeder.
     *
     * This version:
     *   1. Reads all existing beds for this room in ONE query.
     *   2. Bulk-inserts only the missing labels in ONE query (skipped
     *      entirely if nothing is missing).
     *   3. Runs the same deactivation update as before (already a single
     *      query, unchanged).
     *   4. Updates bed_count via the model instance already in memory,
     *      avoiding a redundant SELECT.
     *
     * End result is IDENTICAL bed data to the original implementation —
     * only the number of round-trips changes.
     */
    public function syncBeds(): void
    {
        $labels = range('A', chr(ord('A') + $this->capacity - 1));

        $existingLabels = $this->beds()->pluck('label')->all();
        $missingLabels  = array_diff($labels, $existingLabels);

        if (! empty($missingLabels)) {
            $now = now();
            $rows = [];
            foreach ($missingLabels as $label) {
                $sortOrder = array_search($label, $labels, true);
                $rows[] = [
                    'room_id'    => $this->id,
                    'label'      => $label,
                    'status'     => Bed::STATUS_AVAILABLE,
                    'sort_order' => $sortOrder,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            DB::table('beds')->insert($rows);
        }

        $this->beds()
            ->whereNotIn('label', $labels)
            ->whereNotIn('status', [Bed::STATUS_OCCUPIED, Bed::STATUS_RESERVED])
            ->update(['status' => Bed::STATUS_INACTIVE]);

        $this->update(['bed_count' => count($labels)]);
    }

    /** Derive and cache availability_status from live bed statuses. */
    public function syncAvailability(): void
    {
        $beds = $this->beds()->whereNot('status', Bed::STATUS_INACTIVE)->get();

        if ($beds->isEmpty()) {
            $this->update(['availability_status' => self::STATUS_INACTIVE]);
            return;
        }

        $total     = $beds->count();
        $available = $beds->where('status', Bed::STATUS_AVAILABLE)->count();
        $inMaint   = $beds->where('status', Bed::STATUS_MAINTENANCE)->count();

        $status = match (true) {
            $inMaint === $total  => self::STATUS_MAINTENANCE,
            $available === 0     => self::STATUS_FULL,
            $available < $total  => self::STATUS_LIMITED,
            default              => self::STATUS_AVAILABLE,
        };

        $this->update(['availability_status' => $status]);
    }
}
