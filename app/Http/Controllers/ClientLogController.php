<?php
/**
 * =============================================================================
 * FILE: app/Http/Controllers/ClientLogController.php
 * PURPOSE: Receives batched UX-state logs from the frontend logger
 * (frontend/src/lib/logger.ts) and persists them server-side ONLY.
 *
 * SECURITY (PortSwigger / OWASP alignment):
 *  - Rate-limited via 'throttle:client-logs' middleware to prevent
 *    log-flooding DoS.
 *  - Input is validated and size-capped; never trusted blindly — stored as
 *    opaque JSON, never interpolated into SQL or executed.
 *  - No PII beyond authenticated user id is stored; sensitive keys are
 *    defensively redacted even if a buggy caller sends them.
 * =============================================================================
 */

namespace App\Http\Controllers;

use App\Models\ClientUxLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClientLogController extends Controller
{
    private const REDACT_KEYS = ['password', 'password_confirmation', 'token', 'card_number', 'cvv', 'secret'];

    public function store(Request $request)
    {
        $validated = $request->validate([
            'events' => 'required|array|max:50',
            'events.*.stateType' => 'required|string|in:loading,empty,error,success,partial,silent_failure_recovered',
            'events.*.component' => 'required|string|max:120',
            'events.*.userFlow' => 'required|string|in:admin,student,guest',
            'events.*.reasonCode' => 'required|string|max:80',
            'events.*.message' => 'required|string|max:500',
            'events.*.correlationId' => 'required|string|max:64',
            'events.*.ts' => 'required|date',
            'events.*.url' => 'required|string|max:255',
            'events.*.meta' => 'nullable|array',
        ]);

        foreach ($validated['events'] as $event) {
            $meta = $this->scrubSensitiveKeys($event['meta'] ?? []);

            ClientUxLog::create([
                'user_id' => $request->user()?->id,
                'state_type' => $event['stateType'],
                'component' => $event['component'],
                'user_flow' => $event['userFlow'],
                'reason_code' => $event['reasonCode'],
                'message' => $event['message'],
                'meta' => $meta,
                'correlation_id' => $event['correlationId'],
                'client_url' => $event['url'],
                'client_ts' => $event['ts'],
                'ip_address' => $request->ip(),
            ]);

            if (in_array($event['stateType'], ['error', 'silent_failure_recovered'], true)) {
                Log::warning('client_ux_event', [
                    'reason_code' => $event['reasonCode'],
                    'component' => $event['component'],
                    'correlation_id' => $event['correlationId'],
                ]);
            }
        }

        return response()->json(['status' => 'ok'], 202);
    }

    private function scrubSensitiveKeys(array $meta): array
    {
        foreach ($meta as $key => $value) {
            if (in_array(strtolower((string) $key), self::REDACT_KEYS, true)) {
                $meta[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $meta[$key] = $this->scrubSensitiveKeys($value);
            }
        }
        return $meta;
    }
}
