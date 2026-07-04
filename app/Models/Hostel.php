<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\{AcademicTerm, Bed};

class Hostel extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'location',
        'management_type',    // campus-managed / affiliated
        'campus_location',    // on-campus / off-campus
        'availability_status',// available / limited / full / closed
        'gender_scope',       // male / female / mixed
        'is_religious_order',
        'religious_notes',
        'amenities',
        'description',
        'image_url',
    ];

    protected $casts = [
        'amenities'         => 'array',
        'is_religious_order'=> 'boolean',
    ];

    public const TYPE_CAMPUS     = 'campus-managed';
    public const TYPE_AFFILIATED = 'affiliated';
    public const CAMPUS_ON       = 'on-campus';
    public const CAMPUS_OFF      = 'off-campus';

    // ─── Relationships ─────────────────────────────────────────────────────
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

    // ─── Accessors ─────────────────────────────────────────────────────────
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

    // ─── Local query scopes ────────────────────────────────────────────────
    /**
     * Scope: only hostels that are considered \"active\" for listing.
     *
     * - Not soft-deleted (SoftDeletes already handles this)
     * - availability_status NOT 'closed'
     */
    // 'full' hostels appear in the list; the card shows 0 beds free and disables the CTA.
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('availability_status', '!=', 'closed');
    }

    /**
     * Scope: campus-managed (on-campus) hostels only.
     */
    public function scopeCampus(Builder $query): Builder
    {
        return $query
            ->where('management_type', self::TYPE_CAMPUS)
            ->where('campus_location', self::CAMPUS_ON);
    }

    /**
     * Count available beds across all active rooms for a given term.
     * For campus-managed hostels this is purely bed-status based.
     * For affiliated hostels the term context is the same.
     */
    public function availableBedCount(int $termId): int
    {
        // Use loaded relation if available (avoids N+1 in list view)
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
     *  - The term exists and is currently active
     *  - The hostel's availability_status is not 'closed' or 'full'
     */
    public function isApplicationWindowOpen(AcademicTerm $term): bool
    {
        if (!$term->isActive()) {
            return false;
        }

        return !in_array($this->availability_status, ['closed', 'full'], true);
    }

    /**
     * Sum of capacity across all active rooms.
     * Loaded only when rooms relation is eager-loaded.
     */
    public function getTotalCapacityAttribute(): int
    {
        return $this->rooms
            ->where('is_active', true)
            ->sum('capacity');
    }
}
