import type { RequestProfile } from './contracts';

export const profiles = {
    authentication: {
        name: 'authentication',
        kind: 'authentication',
        scope: 'application',
        criticality: 'blocking',
        concurrency: 'single_flight',
        retry: 'never',
        timeoutMs: 15_000,
        staleData: 'forbid',
        retryBudget: 0,
    },
    read: {
        name: 'read',
        kind: 'read',
        scope: 'section',
        criticality: 'advisory',
        concurrency: 'latest_wins',
        retry: 'safe_transient',
        timeoutMs: 10_000,
        staleData: 'allow_marked',
        retryBudget: 2,
    },
} satisfies Record<string, RequestProfile>;
