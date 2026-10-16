import type { OperationEvent } from '../core/events';
import { createIdentity, identityKey, retryIdentity, sameIdentity } from '../core/identity';
import type { OperationState, RequestProfile, RequestIdentity, RetryOrigin } from '../core/contracts';
import { isRetryEligible, isTerminal } from '../core/guards';
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
    | { kind: 'blocked'; identity: RequestIdentity }
    | { kind: 'already_owner'; identity: RequestIdentity }
    | { kind: 'disposed' };

export type RetryResult =
    | { kind: 'started'; identity: RequestIdentity }
    | { kind: 'blocked_by_claim'; identity: RequestIdentity }
    | { kind: 'policy' | 'ineligible' | 'disposed' | 'not_active' | 'budget_exhausted' };

export type CancelResult =
    | { kind: 'cancelled' }
    | { kind: 'not_cancellable'; reason: 'outcome_unknown' }
    | { kind: 'already_terminal' }
    | { kind: 'disposed' }
    | { kind: 'stale' };

export type FinalizeResult =
    | { kind: 'outcome_accepted' }
    | { kind: 'needs_outcome_classification' }
    | { kind: 'stale' | 'already_released' };

export class OperationCoordinator<T> {
    private state: OperationState<T> = { status: 'idle' };
    private identity?: RequestIdentity;
    private disposed = false;
    private retryAttempts = 0;
    private finalizedAttemptKey?: string;

    constructor(
        private readonly key: string,
        private readonly profile: RequestProfile,
        private readonly registry: OperationRegistry = applicationOperationRegistry,
        private readonly timers: TimerRegistry = new TimerRegistry(),
    ) {}

    start(idempotencyKey?: string): StartResult<T> {
        if (this.disposed) return { kind: 'disposed' };
        if (this.identity && !isTerminal(this.state)) {
            return { kind: 'already_owner', identity: this.identity };
        }
        const identity = createIdentity(0, idempotencyKey);
        const result = this.registry.start(
            this.key,
            this.profile.concurrency,
            identity,
            this.profile.unresolvedOutcome ?? 'block',
        );
        if (result.kind === 'joined') return this.joined(result.record);
        if (result.kind === 'joined_logical') return this.joined(result.identity);
        if (result.kind === 'blocked') return result;
        this.identity = result.record.identity;
        this.retryAttempts = 0;
        this.finalizedAttemptKey = undefined;
        this.bindRecord(result.record);
        if (result.kind === 'queued') {
            this.dispatch({ type: 'QUEUED', identity: this.identity, position: result.position });
            const queuedIdentity = this.identity;
            return {
                kind: 'queued',
                identity: queuedIdentity,
                position: result.position,
                subscribe: (listener) => this.observe(queuedIdentity, listener),
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
        if (this.retryAttempts >= (this.profile.retryBudget ?? 3)) return { kind: 'budget_exhausted' };
        const previous = this.identity;
        const next = retryIdentity(previous, previous.generation + 1);
        const replacement = this.registry.getByIdentity(previous)
            ? this.registry.replace(this.key, previous, next)
            : this.registry.reacquire(this.key, this.profile.concurrency, previous, next);
        if (replacement.kind === 'blocked_by_claim') {
            return { kind: 'blocked_by_claim', identity: replacement.identity };
        }
        if (replacement.kind === 'rejected') return { kind: 'policy' };
        this.timers.clear(previous);
        this.identity = replacement.record.identity;
        this.retryAttempts += 1;
        this.finalizedAttemptKey = undefined;
        this.bindRecord(replacement.record);
        this.dispatch({ type: 'RETRY', identity: this.identity });
        return { kind: 'started', identity: this.identity };
    }

    dispatch(event: OperationEvent<T>): OperationState<T> {
        if (this.disposed) return this.state;
        if (event.type === 'CANCEL' && this.identity && sameIdentity(this.identity, event.identity)) {
            this.registry.cancel(this.key, event.identity, event.cause);
            return this.state;
        }
        if (this.identity && sameIdentity(this.identity, event.identity) &&
            this.registry.isCancelling(event.identity)) return this.state;
        const result = reduceOperationResult(this.state, event);
        if (result.kind === 'rejected_invalid' || result.kind === 'rejected_stale') return this.state;
        this.state = result.state;
        if (result.kind === 'accepted' && this.identity && sameIdentity(this.identity, event.identity)) {
            this.registry.publishLogical(this.identity, this.state as OperationState<unknown>);
        }
        if (isTerminal(this.state) && this.identity && result.kind === 'accepted' && event.type !== 'CANCEL') {
            this.timers.clear(this.identity);
            this.registry.clearCancellation(this.identity);
            this.registry.release(this.identity);
        }
        return this.state;
    }

    revalidate(): OperationState<T> | undefined {
        return this.identity ? this.dispatch({ type: 'REVALIDATE', identity: this.identity }) : undefined;
    }

    finalize(identity = this.identity): FinalizeResult {
        if (!identity || !this.identity || !sameIdentity(identity, this.identity)) return { kind: 'stale' };
        const attemptKey = identityKey(identity);
        if (this.finalizedAttemptKey === attemptKey) {
            return isTerminal(this.state) ? { kind: 'outcome_accepted' } : { kind: 'already_released' };
        }
        this.finalizedAttemptKey = attemptKey;
        this.timers.clear(identity);
        this.registry.clearCancellation(identity);
        if (isTerminal(this.state)) {
            this.registry.release(identity);
            return { kind: 'outcome_accepted' };
        }
        this.dispatch({ type: 'OUTCOME_REQUIRED', identity });
        this.registry.release(identity);
        return { kind: 'needs_outcome_classification' };
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

    cancel(cause: 'user' | 'navigation' | 'transport' = 'user'): CancelResult {
        if (this.disposed) return { kind: 'disposed' };
        if (!this.identity) return { kind: 'stale' };
        if (isTerminal(this.state)) return { kind: 'already_terminal' };
        if (this.state.status === 'awaiting_outcome' || this.state.status === 'reconciling') {
            return { kind: 'not_cancellable', reason: 'outcome_unknown' };
        }
        return this.registry.cancel(this.key, this.identity, cause)
            ? { kind: 'cancelled' }
            : { kind: 'stale' };
    }

    dispose(): void {
        if (this.disposed) return;
        if (this.identity && this.registry.getByIdentity(this.identity)) this.registry.dispose(this.identity);
        else if (this.identity && ['awaiting_outcome', 'reconciling'].includes(this.state.status)) {
            this.dispatch({ type: 'ABANDON', identity: this.identity });
            this.registry.closeLogical(this.identity);
        }
        if (this.identity) this.timers.clear(this.identity);
        this.disposed = true;
    }

    getState(): OperationState<T> { return this.state; }
    getIdentity(): RequestIdentity | undefined { return this.identity; }

    private bindRecord(record: RegisteredOperation): void {
        record.onCancel = (cause) => {
            if (!this.identity || !sameIdentity(this.identity, record.identity)) return;
            const result = reduceOperationResult(this.state, { type: 'CANCEL', identity: record.identity, cause });
            if (result.kind === 'accepted') {
                this.state = result.state;
                this.timers.clear(record.identity);
                this.registry.publishCancellation(record.identity, this.state as OperationState<unknown>);
            }
        };
        record.onPromote = () => {
            if (!this.disposed && this.identity && sameIdentity(this.identity, record.identity)) {
                this.dispatch({ type: 'PROMOTE', identity: record.identity });
            }
        };
    }

    private joined(recordOrIdentity: RegisteredOperation | RequestIdentity): JoinedOperation<T> {
        const identity = 'identity' in recordOrIdentity ? recordOrIdentity.identity : recordOrIdentity;
        return {
            kind: 'joined',
            identity,
            getState: () => this.registry.getState(identity) as OperationState<T> | undefined,
            subscribe: (listener) => this.observe(identity, listener),
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
