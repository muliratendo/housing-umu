<?php
/**
 * FILE: app/Models/ClientUxLog.php
 * PURPOSE: Eloquent model for the client_ux_logs table. Read-only from the
 * frontend's perspective — only ever written via ClientLogController::store().
 * Intended for a future Admin > Logs dashboard so admins see WHY students
 * hit empty/error states without asking them directly.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientUxLog extends Model
{
    protected $fillable = [
        'user_id', 'state_type', 'component', 'user_flow', 'reason_code',
        'message', 'meta', 'correlation_id', 'client_url', 'client_ts', 'ip_address',
    ];

    protected $casts = [
        'meta' => 'array',
        'client_ts' => 'datetime',
    ];
}
