export type FailureKind =
    | 'cancelled' | 'network' | 'timeout' | 'validation' | 'unauthenticated'
    | 'forbidden' | 'conflict' | 'throttled' | 'http' | 'unknown';

export interface FailureDescriptor {
    kind: FailureKind;
    reasonCode: string;
    status?: number;
    retryAt?: number;
    retryable: boolean;
    correlationId?: string;
}

export type FailureInput =
    | { kind: 'cancelled' }
    | { kind: 'network'; reasonCode?: unknown }
    | { kind: 'timeout'; outcomeKnown?: unknown }
    | { kind: 'http'; status: unknown; retryAt?: unknown; reasonCode?: unknown }
    | { kind: 'unknown'; reasonCode?: unknown };

const REASONS = new Set(['NETWORK_ERROR', 'REQUEST_TIMEOUT', 'REQUEST_CANCELLED', 'UNKNOWN_FAILURE']);
const correlation = (value: unknown): string | undefined =>
    typeof value === 'string' && /^corr_[A-Za-z0-9-]{8,128}$/.test(value) ? value : undefined;
const reason = (value: unknown, fallback: string): string =>
    typeof value === 'string' && REASONS.has(value) ? value : fallback;
const unknown = (id?: unknown): FailureDescriptor => ({
    kind: 'unknown',
    reasonCode: 'UNKNOWN_FAILURE',
    retryable: false,
    ...(correlation(id) ? { correlationId: correlation(id) } : {}),
});

export const describeFailure = (input: unknown, correlationId?: unknown): FailureDescriptor => {
    try {
        if (!input || typeof input !== 'object' || !('kind' in input)) return unknown(correlationId);
        const value = input as FailureInput;
        const id = correlation(correlationId);
        if (value.kind === 'cancelled') return { kind: 'cancelled', reasonCode: 'REQUEST_CANCELLED', retryable: false, ...(id ? { correlationId: id } : {}) };
        if (value.kind === 'network') return { kind: 'network', reasonCode: reason(value.reasonCode, 'NETWORK_ERROR'), retryable: true, ...(id ? { correlationId: id } : {}) };
        if (value.kind === 'timeout') return { kind: 'timeout', reasonCode: 'REQUEST_TIMEOUT', retryable: value.outcomeKnown !== true, ...(id ? { correlationId: id } : {}) };
        if (value.kind === 'unknown') return unknown(id);
        if (!Number.isInteger(value.status) || (value.status as number) < 100 || (value.status as number) > 599) return unknown(id);
        if (value.retryAt !== undefined && (!Number.isFinite(value.retryAt) || (value.retryAt as number) < 0)) return unknown(id);
        const status = value.status as number;
        const kind: FailureKind = status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' :
            status === 409 ? 'conflict' : status === 422 ? 'validation' : status === 429 ? 'throttled' : 'http';
        return {
            kind, reasonCode: `HTTP_${status}`, status,
            ...(status === 429 && value.retryAt !== undefined ? { retryAt: value.retryAt as number } : {}),
            retryable: status >= 500,
            ...(id ? { correlationId: id } : {}),
        };
    } catch {
        return unknown(correlationId);
    }
};
