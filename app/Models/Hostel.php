<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hostel extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'location',
        'image_url',
        'management_type',
        'availability_status',
        'gender_scope',
        'is_religious_order',
        'religious_notes',
        'amenities',
        'description',
    ];

    protected $casts = [
        'amenities' => 'array',
        'is_religious_order' => 'boolean',
    ];

    protected $appends = [
        'management_type_label',
        'availability_status_label',
        'gender_scope_label',
    ];

    public const MANAGEMENT_TYPE_LABELS = [
        'campus-managed' => 'Campus Managed',
        'affiliated' => 'Affiliated',
    ];

    public const AVAILABILITY_STATUS_LABELS = [
        'available' => 'Available',
        'limited' => 'Limited',
        'full' => 'Full',
    ];

    public const GENDER_SCOPE_LABELS = [
        'male' => 'Male Only',
        'female' => 'Female Only',
        'mixed' => 'Mixed',
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected function managementTypeLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::MANAGEMENT_TYPE_LABELS[$this->management_type]
                ?? ucfirst(str_replace('-', ' ', (string) $this->management_type))
        );
    }

    protected function availabilityStatusLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::AVAILABILITY_STATUS_LABELS[$this->availability_status]
                ?? ucfirst((string) $this->availability_status)
        );
    }

    protected function genderScopeLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::GENDER_SCOPE_LABELS[$this->gender_scope]
                ?? ucfirst((string) $this->gender_scope)
        );
    }
}
