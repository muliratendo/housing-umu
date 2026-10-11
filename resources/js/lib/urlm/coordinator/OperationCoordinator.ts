import type { OperationEvent } from '../core/events';
import { createIdentity, retryIdentity } from '../core/identity';
import type { OperationState, RequestProfile, RequestIdentity, RetryOrigin } from '../core/contracts';
import { isRetryEligible, isTerminal } from '../core/guards';
import { reduceOperation } from '../core/reducer';
import { applicationOperationRegistry, OperationRegistry, type RegisteredOperation } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';

export interface JoinedOperation<T> {
    readonly kind: 'joined';
    readonly identity: RequestIdentity;
    readonly getState: () => OperationState<T> | undefined;
    readonly subscribe: (listener: (state: OperationState<T>) => void) => () => void;
}

export type StartResult<T> =
    | { kind: 'started'; identity: RequestIdentity }
    | JoinedOperation<T>
    | { kind: 'queued'; identity: RequestIdentity; position: number };

export type RetryResult =
    | { kind: 'started'; identity: RequestIdentity }
    | { kind: 'policy' | 'ineligible' | 'disposed' | 'not_active' | 'budget_exhausted' };

export type FinalizeResult =
    | { kind: 'released'; outcome: 'accepted' | 'outcome_missing' }
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

    start(idempotencyKey?: string): StartResult<T> | undefined {
        if (this.disposed) return undefined;
        const identity = createIdentity(0, idempotencyKey);
        const result = this.registry.start(this.key, this.profile.concurrency, identity);
        if (result.kind === 'joined') return this.joined(result.record);

        this.identity = result.record.identity;
        this.retryAttempts = 0;
        result.record.onSuperseded = () => this.supersede(result.record.identity);
        result.record.onPromote = () => this.promote(result.record);

        if (result.kind === 'queued') {
            this.dispatch({ type: 'QUEUED', identity: this.identity, position: result.position });
            return { kind: 'queued', identity: this.identity, position: result.position };
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
            (this.profile.retry === 'safe_transient' && origin === 'automatic' && !this.isTransientState())) {
            return { kind: 'policy' };
        }
        const budget = this.profile.retryBudget ?? 3;
        if (this.retryAttempts >= budget) return { kind: 'budget_exhausted' };

        const previous = this.identity;
        const nextAttempt = retryIdentity(previous, previous.generation + 1);
        const replacement = this.registry.replace(this.key, previous, nextAttempt);
        if (replacement.kind === 'rejected') return { kind: 'policy' };

        this.timers.clear(previous);
        this.identity = replacement.record.identity;
        this.retryAttempts += 1;
        replacement.record.onSuperseded = () => this.supersede(replacement.record.identity);
        replacement.record.onPromote = () => this.promote(replacement.record);
        this.dispatch({ type: 'RETRY', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    dispatch(event: OperationEvent<T>): OperationState<T> {
        if (this.disposed) return this.state;
        const previous = this.state;
        this.state = reduceOperation(this.state, event);
        this.registry.publish(event.identity, this.state as OperationState<unknown>);
        if (isTerminal(this.state) && this.identity && this.state !== previous) {
            this.timers.clear(this.identity);
            this.registry.clearCancellation(this.identity);
        }
        return this.state;
    }

    revalidate(): OperationState<T> | undefined {
        return this.identity ? this.dispatch({ type: 'REVALIDATE', identity: this.identity }) : undefined;
    }

    finalize(identity = this.identity): FinalizeResult {
        if (!identity || !this.identity || !this.sameIdentity(identity, this.identity)) return { kind: 'stale' };
        const record = this.registry.getByIdentity(identity);
        if (!record) return { kind: 'already_released' };
        this.timers.clear(identity);
        if (!isTerminal(this.state)) {
            this.dispatch({ type: 'UNKNOWN_FAILURE', identity });
            this.registry.release(identity);
            return { kind: 'released', outcome: 'outcome_missing' };
        }
        this.registry.release(identity);
        return { kind: 'released', outcome: 'accepted' };
    }

    setWatchdog(callback: () => void): void {
        const identity = this.identity;
        if (!identity) return;
        this.timers.set(identity, callback, this.profile.timeoutMs, () =>
            !this.disposed &&
            !!this.identity &&
            this.registry.isCurrent(this.key, identity) &&
            this.sameIdentity(identity, this.identity));
    }

    registerCancellation(handler: () => void): () => void {
        return this.identity ? this.registry.registerCancellation(this.identity, handler) : () => undefined;
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
        if (!identity || this.disposed) return;
        if (!isTerminal(this.state)) this.dispatch({ type: 'CANCEL', identity, cause: 'disposed' });
        this.disposed = true;
        this.registry.dispose(identity);
        this.timers.clear(identity);
    }

    getState(): OperationState<T> { return this.state; }
    getIdentity(): RequestIdentity | undefined { return this.identity; }

    private joined(record: RegisteredOperation): JoinedOperation<T> {
        return {
            kind: 'joined',
            identity: record.identity,
            getState: () => this.registry.getState(record.identity) as OperationState<T> | undefined,
            subscribe: (listener) => this.registry.observe(record.identity, listener as (state: OperationState<unknown>) => void),
        };
    }

    private promote(record: RegisteredOperation): void {
        if (this.disposed || !this.identity || !this.sameIdentity(this.identity, record.identity)) return;
        this.dispatch({ type: 'PROMOTE', identity: record.identity });
    }

    private supersede(identity: RequestIdentity): void {
        if (!this.identity || !this.sameIdentity(this.identity, identity)) return;
        this.timers.clear(identity);
        this.dispatch({ type: 'CANCEL', identity, cause: 'superseded' });
    }

    private sameIdentity(a: RequestIdentity, b: RequestIdentity): boolean {
        return a.operationId === b.operationId && a.attemptId === b.attemptId && a.generation === b.generation;
    }

    private isTransientState(): boolean {
        return this.state.status === 'offline' ||
            this.state.status === 'timed_out' ||
            (this.state.status === 'failed' && this.state.retryable);
    }
}
