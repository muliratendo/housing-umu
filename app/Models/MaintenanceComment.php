<?php
// File: app/Models/MaintenanceComment.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $maintenance_request_id
 * @property int $user_id
 * @property string $body
 * @property bool $is_internal Admin-only notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\MaintenanceRequest $maintenanceRequest
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereIsInternal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereMaintenanceRequestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MaintenanceComment withoutTrashed()
 * @mixin \Eloquent
 */
class MaintenanceComment extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = ['maintenance_request_id', 'user_id', 'body', 'is_internal'];
    protected $casts    = ['is_internal' => 'boolean'];

    public function maintenanceRequest(): BelongsTo { return $this->belongsTo(MaintenanceRequest::class); }
    public function user(): BelongsTo               { return $this->belongsTo(User::class); }
}
