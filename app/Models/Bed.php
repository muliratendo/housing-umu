<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bed extends Model
{
    protected $fillable = [
        'room_id',
        'label',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'room_id' => 'integer',
        'sort_order' => 'integer',
    ];

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_RESERVED = 'reserved';
    public const STATUS_OCCUPIED = 'occupied';
    public const STATUS_MAINTENANCE = 'maintenance';
    public const STATUS_INACTIVE = 'inactive';

    public const STATUSES = [
        self::STATUS_AVAILABLE,
        self::STATUS_RESERVED,
        self::STATUS_OCCUPIED,
        self::STATUS_MAINTENANCE,
        self::STATUS_INACTIVE,
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }
}
