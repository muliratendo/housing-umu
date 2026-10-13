import type { OperationEvent } from '../core/events';
import { createIdentity, retryIdentity } from '../core/identity';
import type { OperationState, RequestProfile, RequestIdentity, RetryOrigin } from '../core/contracts';
import { isRetryEligible, isTerminal, sameIdentity } from '../core/guards';
import { reduceOperationResult } from '../core/reducer';
import { applicationOperationRegistry, OperationRegistry, type RegisteredOperation } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';

export interface JoinedOperation<T> {
    readonly kind: 'joined';
    readonly identity: RequestIdentity;
    readonly getState: () => OperationState<T> | undefined;
    readonly subscribe: (listener: (state: OperationState<T>) => void) => () => void;
}

export interface QueuedOperation<T> {
    readonly kind: 'queued';
    readonly identity: RequestIdentity;
    readonly position: number;
    readonly subscribe: (listener: (state: OperationState<T>) => void) => () => void;
}

export type StartResult<T> =
    | { kind: 'started'; identity: RequestIdentity }
    | JoinedOperation<T>
    | QueuedOperation<T>
    | { kind: 'already_owner'; identity: RequestIdentity };

export type RetryResult =
    | { kind: 'started'; identity: RequestIdentity }
    | { kind: 'policy' | 'ineligible' | 'disposed' | 'not_active' | 'budget_exhausted' };

export type FinalizeResult =
    | { kind: 'released'; outcome: 'accepted' }
    | { kind: 'needs_outcome_classification' }
    | { kind: 'stale' | 'already_released' };

export class OperationCoordinator<T> {
    private state: OperationState<T> = { status: 'idle' };
    private identity?: RequestIdentity;
    private disposed = false;
    private retryAttempts = 0;

    constructor(
        private readonly key: string,
        private readonly profile: RequestProfile,
        private readonly registry: OperationRegistry = applicationOperationRegistry,
        private readonly timers: TimerRegistry = new TimerRegistry(),
    ) {}

    start(idempotencyKey?: string): StartResult<T> {
        if (this.disposed) return { kind: 'already_owner', identity: this.identity ?? createIdentity() };
        if (this.identity && !isTerminal(this.state) && this.registry.getByIdentity(this.identity)) {
            return { kind: 'already_owner', identity: this.identity };
        }
        const identity = createIdentity(0, idempotencyKey);
        const result = this.registry.start(this.key, this.profile.concurrency, identity);
        if (result.kind === 'joined') return this.joined(result.record);

        this.identity = result.record.identity;
        this.retryAttempts = 0;
        this.bindRecord(result.record);
        if (result.kind === 'queued') {
            this.dispatch({ type: 'QUEUED', identity: this.identity, position: result.position });
            return {
                kind: 'queued',
                identity: this.identity,
                position: result.position,
                subscribe: (listener) => this.observe(this.identity!, listener),
            };
        }
        this.dispatch({ type: 'START', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    retry(origin: RetryOrigin = 'user'): RetryResult {
        if (this.disposed || !this.identity) return { kind: this.disposed ? 'disposed' : 'not_active' };
        if (!isRetryEligible(this.state)) return { kind: 'ineligible' };
        if (this.profile.retry === 'never' ||
            (this.profile.retry === 'user_only' && origin === 'automatic') ||
            (this.profile.retry === 'idempotent_only' && !this.identity.idempotencyKey) ||
            (this.profile.retry === 'safe_transient' && origin === 'automatic' && !this.isTransientState())) return { kind: 'policy' };
        const budget = this.profile.retryBudget ?? 3;
        if (this.retryAttempts >= budget) return { kind: 'budget_exhausted' };
        const previous = this.identity;
        const nextAttempt = retryIdentity(previous, previous.generation + 1);
        const replacement = this.registry.replace(this.key, previous, nextAttempt);
        if (replacement.kind === 'rejected') return { kind: 'policy' };
        this.timers.clear(previous);
        this.identity = replacement.record.identity;
        this.retryAttempts += 1;
        this.bindRecord(replacement.record);
        this.dispatch({ type: 'RETRY', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    dispatch(event: OperationEvent<T>): OperationState<T> {
        if (this.disposed) return this.state;
        const result = reduceOperationResult(this.state, event);
        if (result.kind === 'rejected_invalid' || result.kind === 'rejected_stale') return this.state;
        this.state = result.state;
        if (result.kind === 'accepted' && this.identity && sameIdentity(this.identity, event.identity)) {
            this.registry.publish(this.identity, this.state as OperationState<unknown>);
        }
        if (isTerminal(this.state) && this.identity && result.kind === 'accepted' && event.type !== 'CANCEL') {
            this.timers.clear(this.identity);
            this.registry.clearCancellation(this.identity);
            if (!isRetryEligible(this.state)) this.registry.release(this.identity);
        }
        return this.state;
    }

    revalidate(): OperationState<T> | undefined {
        return this.identity ? this.dispatch({ type: 'REVALIDATE', identity: this.identity }) : undefined;
    }

    finalize(identity = this.identity): FinalizeResult {
        if (!identity || !this.identity || !sameIdentity(identity, this.identity)) return { kind: 'stale' };
        if (!this.registry.getByIdentity(identity)) return { kind: 'already_released' };
        this.timers.clear(identity);
        if (!isTerminal(this.state)) {
            this.dispatch({ type: 'OUTCOME_REQUIRED', identity });
            return { kind: 'needs_outcome_classification' };
        }
        this.registry.release(identity);
        return { kind: 'released', outcome: 'accepted' };
    }

    setWatchdog(callback: () => void): void {
        const identity = this.identity;
        if (!identity) return;
        this.timers.set(identity, callback, this.profile.timeoutMs, () =>
            !this.disposed && !!this.identity && sameIdentity(identity, this.identity) &&
            this.registry.isCurrent(this.key, identity));
    }

    registerCancellation(handler: () => void): () => void {
        return this.identity ? this.registry.registerCancellation(this.identity, handler) : () => undefined;
    }

    cancel(cause: 'user' | 'navigation' | 'transport' = 'user'): void {
        if (this.identity) this.registry.cancel(this.key, this.identity, cause);
    }

    dispose(): void {
        if (this.disposed) return;
        if (this.identity && !isTerminal(this.state)) this.registry.dispose(this.identity);
        this.disposed = true;
        if (this.identity) this.timers.clear(this.identity);
    }

    getState(): OperationState<T> { return this.state; }
    getIdentity(): RequestIdentity | undefined { return this.identity; }

    private bindRecord(record: RegisteredOperation): void {
        record.onCancel = (cause) => {
            if (this.identity && sameIdentity(this.identity, record.identity)) {
                this.dispatch({ type: 'CANCEL', identity: record.identity, cause });
            }
        };
        record.onPromote = () => {
            if (this.disposed || !this.identity || !sameIdentity(this.identity, record.identity)) return;
            this.dispatch({ type: 'PROMOTE', identity: record.identity });
        };
    }

    private joined(record: RegisteredOperation): JoinedOperation<T> {
        return {
            kind: 'joined',
            identity: record.identity,
            getState: () => this.registry.getState(record.identity) as OperationState<T> | undefined,
            subscribe: (listener) => this.observe(record.identity, listener),
        };
    }

    private observe(identity: RequestIdentity, listener: (state: OperationState<T>) => void): () => void {
        return this.registry.observe(identity, listener as (state: OperationState<unknown>) => void);
    }

    private isTransientState(): boolean {
        return this.state.status === 'offline' || this.state.status === 'timed_out' ||
            (this.state.status === 'failed' && this.state.retryable);
    }
}
