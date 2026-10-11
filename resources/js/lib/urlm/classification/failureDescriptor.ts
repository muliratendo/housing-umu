export type FailureKind =
    | 'cancelled'
    | 'network'
    | 'timeout'
    | 'validation'
    | 'unauthenticated'
    | 'forbidden'
    | 'conflict'
    | 'throttled'
    | 'http'
    | 'unknown';

export interface FailureDescriptor {
    kind: FailureKind;
    reasonCode: string;
    status?: number;
    retryAt?: number;
    retryable: boolean;
    correlationId?: string;
}

export interface FailureInput {
    status?: number;
    retryAt?: number;
    reasonCode?: string;
    kind?: FailureKind;
    cancelled?: boolean;
    timeout?: boolean;
}

const hasAbortName = (input: unknown): boolean =>
    typeof input === 'object' &&
    input !== null &&
    'name' in input &&
    input.name === 'AbortError';

export const describeFailure = (input: unknown, correlationId?: string): FailureDescriptor => {
    // Classification copies only allowlisted protocol fields; raw input never enters the descriptor.
    if (typeof input === 'object' && input !== null) {
        const value = input as FailureInput;
        if (value.cancelled || hasAbortName(input)) {
            return { kind: 'cancelled', reasonCode: 'REQUEST_CANCELLED', retryable: false, correlationId };
        }
        if (value.timeout) {
            return { kind: 'timeout', reasonCode: 'REQUEST_TIMEOUT', retryable: true, correlationId };
        }
        if (typeof value.status === 'number') {
            const status = value.status;
            const kind: FailureKind =
                status === 401 ? 'unauthenticated' :
                status === 403 ? 'forbidden' :
                status === 409 ? 'conflict' :
                status === 422 ? 'validation' :
                status === 429 ? 'throttled' :
                'http';
            return {
                kind,
                reasonCode: value.reasonCode ?? `HTTP_${status}`,
                status,
                ...(status === 429 && typeof value.retryAt === 'number' ? { retryAt: value.retryAt } : {}),
                retryable: status >= 500,
                correlationId,
            };
        }
        if (value.kind && value.kind !== 'unknown') {
            return { kind: value.kind, reasonCode: value.reasonCode ?? 'CLASSIFIED_FAILURE', retryable: false, correlationId };
        }
    }
    if (input instanceof TypeError) {
        return { kind: 'network', reasonCode: 'NETWORK_ERROR', retryable: true, correlationId };
    }
    return { kind: 'unknown', reasonCode: 'UNKNOWN_FAILURE', retryable: false, correlationId };
};
