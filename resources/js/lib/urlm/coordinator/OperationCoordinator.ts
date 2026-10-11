import type { OperationEvent } from '../core/events';
import { createIdentity, retryIdentity } from '../core/identity';
import type { OperationState, RequestProfile, RequestIdentity } from '../core/contracts';
import { isTerminal } from '../core/guards';
import { reduceOperation } from '../core/reducer';
import { OperationRegistry } from './OperationRegistry';
import { TimerRegistry } from './TimerRegistry';

export class OperationCoordinator<T> {
    private state: OperationState<T> = { status: 'idle' };
    private identity?: RequestIdentity;
    private disposed = false;

    constructor(
        private readonly key: string,
        private readonly profile: RequestProfile,
        private readonly registry = new OperationRegistry(),
        private readonly timers = new TimerRegistry(),
    ) {}

    start(idempotencyKey?: string): RequestIdentity | undefined {
        if (this.disposed) return undefined;
        if (this.identity) this.timers.clear(this.identity.operationId);
        const identity = createIdentity(undefined, idempotencyKey);
        const record = this.registry.start(this.key, this.profile.concurrency, identity.operationId);
        if (!record || record.operationId !== identity.operationId) return this.identity;
        this.identity = { ...identity, generation: record.generation };
        this.dispatch({ type: 'START', identity: this.identity });
        return this.identity;
    }

    retry(): RequestIdentity | undefined {
        if (!this.identity) return undefined;
        this.timers.clear(this.identity.operationId);
        const record = this.registry.start(this.key, this.profile.concurrency, this.identity.operationId);
        if (!record) return undefined;
        this.identity = retryIdentity(this.identity, record.generation);
        this.dispatch({ type: 'RETRY', identity: this.identity });
        return this.identity;
    }

    dispatch(event: OperationEvent<T>): OperationState<T> {
        if (this.disposed) return this.state;
        this.state = reduceOperation(this.state, event);
        if (isTerminal(this.state) && 'id' in this.state) this.timers.clear(this.state.id.operationId);
        return this.state;
    }

    setWatchdog(callback: () => void): void {
        if (this.identity) this.timers.set(this.identity.operationId, callback, this.profile.timeoutMs);
    }

    cancel(cause: 'user' | 'navigation' | 'transport' = 'user'): void {
        if (!this.identity) return;
        this.registry.cancel(this.key, cause === 'navigation' ? 'disposed' : 'user');
        this.dispatch({ type: 'CANCEL', identity: this.identity, cause });
    }

    dispose(): void {
        this.disposed = true;
        this.registry.cancel(this.key, 'disposed');
        this.timers.clearAll();
    }

    getState(): OperationState<T> { return this.state; }
    getIdentity(): RequestIdentity | undefined { return this.identity; }
}
