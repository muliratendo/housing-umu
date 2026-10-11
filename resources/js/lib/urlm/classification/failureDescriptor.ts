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
    | { kind: 'network'; reasonCode?: string }
    | { kind: 'timeout'; outcomeKnown?: boolean }
    | { kind: 'http'; status: number; retryAt?: number; reasonCode?: string }
    | { kind: 'unknown'; reasonCode?: string };

const safeText = (value: string | undefined, fallback: string): string => {
    if (!value) return fallback;
    const sanitized = value.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64);
    return sanitized || fallback;
};

const safeCorrelation = (value: string | undefined): string | undefined =>
    value ? value.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 128) || undefined : undefined;

const unknown = (correlationId?: string): FailureDescriptor => ({
    kind: 'unknown',
    reasonCode: 'UNKNOWN_FAILURE',
    retryable: false,
    ...(safeCorrelation(correlationId) ? { correlationId: safeCorrelation(correlationId) } : {}),
});

export const describeFailure = (input: FailureInput, correlationId?: string): FailureDescriptor => {
    const safeId = safeCorrelation(correlationId);
    if (!input || typeof input !== 'object' || !('kind' in input)) return unknown(correlationId);
    if (input.kind === 'cancelled') return { kind: 'cancelled', reasonCode: 'REQUEST_CANCELLED', retryable: false, ...(safeId ? { correlationId: safeId } : {}) };
    if (input.kind === 'network') return { kind: 'network', reasonCode: safeText(input.reasonCode, 'NETWORK_ERROR'), retryable: true, ...(safeId ? { correlationId: safeId } : {}) };
    if (input.kind === 'timeout') return { kind: 'timeout', reasonCode: 'REQUEST_TIMEOUT', retryable: !input.outcomeKnown, ...(safeId ? { correlationId: safeId } : {}) };
    if (input.kind !== 'http') return { ...unknown(correlationId), ...(input.reasonCode ? { reasonCode: safeText(input.reasonCode, 'UNKNOWN_FAILURE') } : {}) };
    if (!Number.isInteger(input.status) || input.status < 100 || input.status > 599) return unknown(correlationId);
    if (input.retryAt !== undefined && (!Number.isFinite(input.retryAt) || input.retryAt < 0)) return unknown(correlationId);
    const status = input.status;
    const kind: FailureKind = status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' :
        status === 409 ? 'conflict' : status === 422 ? 'validation' : status === 429 ? 'throttled' : 'http';
    return {
        kind,
        reasonCode: safeText(input.reasonCode, `HTTP_${status}`),
        status,
        ...(status === 429 && input.retryAt !== undefined ? { retryAt: input.retryAt } : {}),
        retryable: status >= 500,
        ...(safeId ? { correlationId: safeId } : {}),
    };
};
