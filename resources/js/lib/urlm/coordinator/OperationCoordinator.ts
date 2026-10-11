import type { OperationEvent } from '../core/events';
import { createIdentity, retryIdentity } from '../core/identity';
import type { OperationState, RequestProfile, RequestIdentity, RetryOrigin } from '../core/contracts';
import { isRetryEligible, isTerminal } from '../core/guards';
import { reduceOperation } from '../core/reducer';
import { applicationOperationRegistry, OperationRegistry, type RegistryStartResult } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';

export type StartResult =
    | { kind: 'started'; identity: RequestIdentity }
    | { kind: 'joined'; identity: RequestIdentity }
    | { kind: 'queued'; identity: RequestIdentity; position: number };

export type RetryResult =
    | { kind: 'started'; identity: RequestIdentity }
    | { kind: 'policy' | 'ineligible' | 'disposed' | 'not_active' };

export class OperationCoordinator<T> {
    private state: OperationState<T> = { status: 'idle' };
    private identity?: RequestIdentity;
    private disposed = false;

    constructor(
        private readonly key: string,
        private readonly profile: RequestProfile,
        private readonly registry: OperationRegistry = applicationOperationRegistry,
        private readonly timers: TimerRegistry = new TimerRegistry(),
    ) {}

    start(idempotencyKey?: string): StartResult | undefined {
        if (this.disposed) return undefined;
        const identity = createIdentity(0, idempotencyKey);
        const result = this.registry.start(this.key, this.profile.concurrency, identity);
        if (result.kind === 'joined') return { kind: 'joined', identity: result.record.identity };
        if (result.kind === 'queued') return { kind: 'queued', identity: result.record.identity, position: result.position };
        this.retireLocalLifecycle();
        this.identity = result.record.identity;
        result.record.onSuperseded = () => this.supersede(result.record.identity);
        this.dispatch({ type: 'START', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    retry(origin: RetryOrigin = 'user'): RetryResult {
        if (this.disposed || !this.identity) return { kind: this.disposed ? 'disposed' : 'not_active' };
        if (!isRetryEligible(this.state)) return { kind: 'ineligible' };
        if (this.profile.retry === 'never' ||
            (this.profile.retry === 'safe_transient' && origin === 'automatic' && this.state.status !== 'offline' && this.state.status !== 'timed_out' && this.state.status !== 'failed') ||
            (this.profile.retry === 'idempotent_only' && !this.identity.idempotencyKey) ||
            (this.profile.retry === 'user_only' && origin === 'automatic')) {
            return { kind: 'policy' };
        }
        // A retry is a new attempt on the same logical operation.
        const previous = this.identity;
        this.registry.cancel(this.key, previous, 'transport');
        this.timers.clear(previous);
        const nextAttempt = retryIdentity(previous, previous.generation + 1);
        const result = this.registry.start(this.key, this.profile.concurrency, nextAttempt);
        if (result.kind !== 'started') return { kind: 'policy' };
        this.identity = result.record.identity;
        result.record.onSuperseded = () => this.supersede(result.record.identity);
        this.dispatch({ type: 'RETRY', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    dispatch(event: OperationEvent<T>): OperationState<T> {
        if (this.disposed) return this.state;
        const previous = this.state;
        this.state = reduceOperation(this.state, event);
        if (isTerminal(this.state) && this.identity && this.state !== previous) {
            this.timers.clear(this.identity);
            this.registry.release(this.identity);
        }
        return this.state;
    }

    setWatchdog(callback: () => void): void {
        const identity = this.identity;
        if (!identity) return;
        // The authority check runs immediately before the callback, not only when scheduled.
        this.timers.set(identity, callback, this.profile.timeoutMs, () =>
            !this.disposed && !!this.identity &&
            this.registry.isCurrent(this.key, identity) &&
            this.identity.operationId === identity.operationId &&
            this.identity.attemptId === identity.attemptId &&
            this.identity.generation === identity.generation);
    }

    registerCancellation(handler: () => void): () => void {
        return this.identity
            ? this.registry.registerCancellation(this.identity, handler)
            : () => undefined;
    }

    cancel(cause: 'user' | 'navigation' | 'transport' = 'user'): void {
        const identity = this.identity;
        if (!identity) return;
        this.registry.cancel(this.key, identity, cause);
        this.timers.clear(identity);
        this.dispatch({ type: 'CANCEL', identity, cause });
    }

    dispose(): void {
        const identity = this.identity;
        this.disposed = true;
        if (identity) {
            this.registry.dispose(identity);
            this.timers.clear(identity);
        }
    }

    getState(): OperationState<T> { return this.state; }
    getIdentity(): RequestIdentity | undefined { return this.identity; }

    private retireLocalLifecycle(): void {
        if (this.identity) this.timers.clear(this.identity);
        this.state = { status: 'idle' };
    }

    private supersede(identity: RequestIdentity): void {
        if (!this.identity || this.identity.operationId !== identity.operationId) return;
        this.timers.clear(identity);
        this.dispatch({ type: 'CANCEL', identity, cause: 'superseded' });
    }
}
