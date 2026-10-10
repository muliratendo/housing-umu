<?php
// File: app/Models/Hostel.php  — REPLACE existing.
// Fixes applied:
//  1. Added hostel_type, gender_policy, image_path accessors (alias columns)
//  2. Added price_per_semester accessor (derives from first active room price)
//  3. getTotalCapacityAttribute now guards against unloaded relation

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $location
 * @property string $management_type
 * @property string $campus_location
 * @property string $availability_status
 * @property string $gender_scope
 * @property bool $is_religious_order
 * @property bool $applications_open
 * @property string|null $religious_notes
 * @property array<array-key, mixed>|null $amenities
 * @property string|null $description
 * @property string|null $image_url
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Allocation> $allocations
 * @property-read int|null $allocations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Application> $applications
 * @property-read int|null $applications_count
 * @property-read string $availability_status_label
 * @property-read string $gender_policy
 * @property-read string $gender_scope_label
 * @property-read string $hostel_type
 * @property-read string|null $image_path
 * @property-read string $management_type_label
 * @property-read int $price_per_semester
 * @property-read int $total_capacity
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $rooms
 * @property-read int|null $rooms_count
 * @method static Builder<static>|Hostel active()
 * @method static Builder<static>|Hostel campus()
 * @method static Builder<static>|Hostel newModelQuery()
 * @method static Builder<static>|Hostel newQuery()
 * @method static Builder<static>|Hostel onlyTrashed()
 * @method static Builder<static>|Hostel query()
 * @method static Builder<static>|Hostel whereAmenities($value)
 * @method static Builder<static>|Hostel whereAvailabilityStatus($value)
 * @method static Builder<static>|Hostel whereCampusLocation($value)
 * @method static Builder<static>|Hostel whereCreatedAt($value)
 * @method static Builder<static>|Hostel whereDeletedAt($value)
 * @method static Builder<static>|Hostel whereDescription($value)
 * @method static Builder<static>|Hostel whereGenderScope($value)
 * @method static Builder<static>|Hostel whereId($value)
 * @method static Builder<static>|Hostel whereImageUrl($value)
 * @method static Builder<static>|Hostel whereIsReligiousOrder($value)
 * @method static Builder<static>|Hostel whereLocation($value)
 * @method static Builder<static>|Hostel whereManagementType($value)
 * @method static Builder<static>|Hostel whereName($value)
 * @method static Builder<static>|Hostel whereReligiousNotes($value)
 * @method static Builder<static>|Hostel whereSlug($value)
 * @method static Builder<static>|Hostel whereUpdatedAt($value)
 * @method static Builder<static>|Hostel withTrashed(bool $withTrashed = true)
 * @method static Builder<static>|Hostel withoutTrashed()
 * @mixin \Eloquent
 */
class Hostel extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'location',
        'management_type',     // campus-managed / affiliated
        'campus_location',     // on-campus / off-campus
        'availability_status', // available / limited / full / closed
        'gender_scope',        // male / female / mixed
        'applications_open',
        'is_religious_order',
        'religious_notes',
        'amenities',
        'description',
        'image_url',
    ];

    protected $casts = [
        'amenities'          => 'array',
        'is_religious_order' => 'boolean',
        'applications_open'  => 'boolean',
    ];

    // ─── Type constants ─────────────────────────────────────────────────────
    public const TYPE_CAMPUS     = 'campus-managed';
    public const TYPE_AFFILIATED = 'affiliated';
    public const CAMPUS_ON       = 'on-campus';
    public const CAMPUS_OFF      = 'off-campus';

    // ─── Relationships ───────────────────────────────────────────────────────
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    /**
     * Users explicitly assigned to manage this hostel.
     *
     * This pivot relation is the source of truth for hostel-level management
     * access. Do not use a non-existent `managed_by` attribute / column.
     */
    public function managers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'hostel_managers')
            ->withTimestamps();
    }

    // ─── Alias accessors (bridge schema → API field names) ──────────────────

    /**
     * API field: hostel_type → backed by management_type column.
     * Controllers and front-end use $hostel->hostel_type everywhere.
     */
    public function getHostelTypeAttribute(): string
    {
        return $this->management_type;
    }

    /**
     * API field: gender_policy → backed by gender_scope column.
     */
    public function getGenderPolicyAttribute(): string
    {
        return $this->gender_scope;
    }

    /**
     * API field: image_path → backed by image_url column.
     */
    public function getImagePathAttribute(): ?string
    {
        return $this->image_url;
    }

    /**
     * API field: price_per_semester
     * The hostels table has NO price column; price lives on rooms.
     * Returns the lowest active-room price, or 0 if none loaded.
     *
     * NOTE: eager-load 'rooms' before calling this to avoid N+1 queries.
     */
    public function getPricePerSemesterAttribute(): int
    {
        if ($this->relationLoaded('rooms')) {
            return (int) $this->rooms
                ->where('is_active', true)
                ->pluck('price_per_semester')
                ->filter()
                ->sort()
                ->first() ?? 0;
        }

        // Fallback: single DB query (avoid in list views — eager-load instead)
        return (int) $this->rooms()
            ->where('is_active', true)
            ->orderBy('price_per_semester')
            ->value('price_per_semester') ?? 0;
    }

    // ─── Display-label accessors ────────────────────────────────────────────
    public function getManagementTypeLabelAttribute(): string
    {
        return $this->management_type === self::TYPE_AFFILIATED
            ? 'Affiliated'
            : 'Campus-Managed';
    }

    public function getAvailabilityStatusLabelAttribute(): string
    {
        return match ($this->availability_status) {
            'limited' => 'Limited Availability',
            'full'    => 'Fully Occupied',
            'closed'  => 'Closed',
            default   => 'Available',
        };
    }

    public function getGenderScopeLabelAttribute(): string
    {
        return match ($this->gender_scope) {
            'male'   => 'Male Only',
            'female' => 'Female Only',
            default  => 'Mixed',
        };
    }

    // ─── Computed attributes ────────────────────────────────────────────────

    /**
     * Sum of capacity across all active rooms.
     * Guards against unloaded relation by returning 0 rather than crashing.
     * Always eager-load 'rooms' before accessing this attribute in list views.
     */
    public function getTotalCapacityAttribute(): int
    {
        if (! $this->relationLoaded('rooms')) {
            return (int) $this->rooms()->where('is_active', true)->sum('capacity');
        }

        return (int) $this->rooms
            ->where('is_active', true)
            ->sum('capacity');
    }

    // ─── Methods ─────────────────────────────────────────────────────────────

    /**
     * Count available beds across all active rooms for a given term.
     * Prefers loaded relation to avoid N+1 in list views.
     */
    public function availableBedCount(int $termId): int
    {
        if ($this->relationLoaded('rooms')) {
            return $this->rooms
                ->where('is_active', true)
                ->flatMap(fn(Room $r) => $r->relationLoaded('beds') ? $r->beds : $r->beds()->get())
                ->where('status', Bed::STATUS_AVAILABLE)
                ->count();
        }

        return $this->rooms()
            ->where('is_active', true)
            ->withCount(['beds as available_bed_count' => fn($q) => $q->where('status', Bed::STATUS_AVAILABLE)])
            ->get()
            ->sum('available_bed_count');
    }

    /**
     * Application window is open when:
     *   1. The term is the currently active one (is_current = true) — FIX:
     *      previously called $term->isActive(), which doesn't exist on
     *      AcademicTerm and threw a BadMethodCallException on every request
     *      that reached this method.
     *   2. The term's own application date window is open (start/end dates).
     *   3. This specific hostel has been marked open for applications by an
     *      admin (applications_open) — this is what AcademicTermController::
     *      activate() bulk-sets to true, and what the per-hostel toggle in
     *      HostelController::toggleApplications() flips individually.
     *   4. The hostel isn't full/closed.
     */
    public function isApplicationWindowOpen(AcademicTerm $term): bool
    {
        if (! $term->is_current) {
            return false;
        }

        if (! $term->isApplicationWindowOpen()) {
            return false;
        }

        if (! $this->applications_open) {
            return false;
        }

        return ! in_array($this->availability_status, ['closed', 'full'], true);
    }

    // ─── Local query scopes ──────────────────────────────────────────────────

    /**
     * Scope: hostels active for public listing (not closed, not soft-deleted).
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('availability_status', '!=', 'closed');
    }

    /**
     * Scope: campus-managed on-campus hostels only.
     */
    public function scopeCampus(Builder $query): Builder
    {
        return $query
            ->where('management_type', self::TYPE_CAMPUS)
            ->where('campus_location', self::CAMPUS_ON);
    }
}
