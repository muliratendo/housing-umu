export interface FailureDescriptor {
    kind: 'network' | 'timeout' | 'http' | 'validation' | 'unknown';
    reasonCode: string;
    retryable: boolean;
    status?: number;
    correlationId?: string;
}

export const describeFailure = (input: unknown, correlationId?: string): FailureDescriptor => {
    if (input instanceof DOMException && input.name === 'AbortError') {
        return { kind: 'timeout', reasonCode: 'REQUEST_ABORTED', retryable: false, correlationId };
    }
    if (input instanceof TypeError) return { kind: 'network', reasonCode: 'NETWORK_ERROR', retryable: true, correlationId };
    if (typeof input === 'object' && input !== null && 'status' in input && typeof input.status === 'number') {
        const status = input.status;
        return { kind: 'http', reasonCode: `HTTP_${status}`, retryable: status >= 500, status, correlationId };
    }
    return { kind: 'unknown', reasonCode: 'UNKNOWN_FAILURE', retryable: false, correlationId };
};
