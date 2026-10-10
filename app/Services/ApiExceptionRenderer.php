<?php
/**
 * =============================================================================
 * FILE: app/Services/ApiExceptionRenderer.php
 * PURPOSE: Converts ANY backend exception into a safe, generic JSON error
 * response with a reason_code the frontend ERROR_COPY library understands
 * — while logging the REAL exception (message, trace, file/line) server-side
 * only via Laravel's default log channel (storage/logs).
 *
 * SECURITY (PortSwigger guidance on information disclosure / error handling):
 *  - APP_DEBUG must be false in production (.env) so Laravel's own debug
 *    page/stack trace is never rendered to the browser.
 *  - This renderer is the single choke point mapping internal exception
 *    types -> external reason codes, so no controller can accidentally
 *    `return $e->getMessage()` to the client.
 * =============================================================================
 */

namespace App\Services;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ApiExceptionRenderer
{
    public function render(Throwable $e, string $correlationId): array
    {
        [$status, $reasonCode] = $this->classify($e);

        Log::error('api_exception', [
            'correlation_id' => $correlationId,
            'reason_code' => $reasonCode,
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return [
            'status' => $status,
            'body' => [
                'error' => true,
                'reason_code' => $reasonCode,
                'correlation_id' => $correlationId,
                // Deliberately no 'message' key with raw exception text.
                // The frontend maps reason_code -> ERROR_COPY[reason_code].
            ],
        ];
    }

    private function classify(Throwable $e): array
    {
        return match (true) {
            $e instanceof ValidationException => [422, 'VALIDATION_FAILED'],
            $e instanceof AuthenticationException => [401, 'SESSION_EXPIRED'],
            $e instanceof AuthorizationException => [403, 'PERMISSION_DENIED'],
            $e instanceof NotFoundHttpException => [404, 'NOT_FOUND'],
            $e instanceof QueryException => [500, 'SERVER_ERROR'],
            default => [500, 'UNKNOWN_ERROR'],
        };
    }

    public static function newCorrelationId(): string
    {
        return (string) Str::uuid();
    }
}
