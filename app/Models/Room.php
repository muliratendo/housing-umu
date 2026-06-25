<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    protected $fillable = [
        'hostel_id',
        'name',
        'slug',
        'room_type',
        'capacity',
        'bed_count',
        'price_per_semester',
        'availability_status',
        'gender_scope',
        'description',
        'amenities',
        'image_url',
    ];

    protected $casts = [
        'amenities' => 'array',
        'price_per_semester' => 'decimal:2',
        'capacity' => 'integer',
        'bed_count' => 'integer',
    ];

    protected $appends = [
        'room_type_label',
        'bed_count_label',
        'availability_status_label',
        'gender_scope_label',
    ];

    public const ROOM_TYPE_LABELS = [
        'self-contained' => 'Self-contained',
        'standard' => 'Standard',
        'apartment' => 'Apartment',
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

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    protected function roomTypeLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::ROOM_TYPE_LABELS[$this->room_type] ?? ucfirst((string) $this->room_type)
        );
    }

    protected function bedCountLabel(): Attribute
    {
        return Attribute::make(
            get: function (): string {
                return match ((int) $this->bed_count) {
                    1 => 'Single Room',
                    2 => 'Double Room',
                    default => ((int) $this->bed_count) . ' beds',
                };
            }
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
