import type { CancelCause, Concurrency, OperationState, RequestIdentity } from '../core/contracts';

export interface RegisteredOperation {
    readonly key: string;
    readonly policy: Concurrency;
    readonly identity: RequestIdentity;
    readonly controller: AbortController;
    queued: boolean;
    cancelled: boolean;
    superseded: boolean;
    readonly cancellationHandlers: Set<() => void>;
    readonly listeners: Set<(state: OperationState<unknown>) => void>;
    onSuperseded?: () => void;
    onPromote?: () => void;
}

export type RegistryStartResult =
    | { kind: 'started'; record: RegisteredOperation }
    | { kind: 'joined'; record: RegisteredOperation }
    | { kind: 'queued'; record: RegisteredOperation; position: number };

export type RegistryReleaseResult = { released: boolean; promoted?: RegisteredOperation };
export type RegistryReplaceResult = { kind: 'replaced'; record: RegisteredOperation } | { kind: 'rejected' };

const sameOwner = (a: RegisteredOperation, identity: RequestIdentity): boolean =>
    a.identity.operationId === identity.operationId &&
    a.identity.attemptId === identity.attemptId &&
    a.identity.generation === identity.generation;

export class OperationRegistry {
    private readonly records = new Map<string, RegisteredOperation[]>();
    private readonly states = new Map<string, OperationState<unknown>>();
    private generation = 0;

    start(key: string, policy: Concurrency, identity: RequestIdentity): RegistryStartResult {
        const records = this.records.get(key) ?? [];
        for (const record of [...records]) {
            const state = this.states.get(this.stateKey(record.identity));
            if (state && ['succeeded', 'empty', 'validation_failed', 'auth_required', 'forbidden', 'conflicted', 'throttled', 'offline', 'timed_out', 'cancelled', 'failed', 'unknown_failure'].includes(state.status)) {
                this.release(record.identity);
            }
        }
        if (policy === 'single_flight') {
            const active = records[0];
            if (active && !active.cancelled) return { kind: 'joined', record: active };
        }
        if (policy === 'latest_wins') {
            for (const record of [...records]) this.cancelRecord(record, 'superseded');
        }
        const record = this.createRecord(key, policy, identity, policy === 'queue' && records.length > 0);
        records.push(record);
        this.records.set(key, records);
        return record.queued
            ? { kind: 'queued', record, position: records.length - 1 }
            : { kind: 'started', record };
    }

    replace(key: string, identity: RequestIdentity, nextIdentity: RequestIdentity): RegistryReplaceResult {
        const records = this.records.get(key);
        const index = records?.findIndex((record) => sameOwner(record, identity)) ?? -1;
        if (!records || index < 0) return { kind: 'rejected' };
        const previous = records[index];
        this.abortResources(previous);
        const replacement = this.createRecord(key, previous.policy, nextIdentity, previous.queued);
        records[index] = replacement;
        this.states.delete(this.stateKey(identity));
        return { kind: 'replaced', record: replacement };
    }

    get(key: string): RegisteredOperation | undefined { return this.records.get(key)?.[0]; }

    getByIdentity(identity: RequestIdentity): RegisteredOperation | undefined {
        for (const records of this.records.values()) {
            const found = records.find((record) => sameOwner(record, identity));
            if (found) return found;
        }
        return undefined;
    }

    isCurrent(key: string, identity: RequestIdentity): boolean {
        const records = this.records.get(key);
        const record = records?.find((candidate) => sameOwner(candidate, identity));
        return !!record && !record.cancelled && (!record.queued || records?.[0] === record);
    }

    publish(identity: RequestIdentity, state: OperationState<unknown>): void {
        this.states.set(this.stateKey(identity), state);
        const record = this.getByIdentity(identity);
        for (const listener of record?.listeners ?? []) listener(state);
    }

    observe(identity: RequestIdentity, listener: (state: OperationState<unknown>) => void): () => void {
        const record = this.getByIdentity(identity);
        if (!record) return () => undefined;
        record.listeners.add(listener);
        const state = this.states.get(this.stateKey(identity));
        if (state) listener(state);
        return () => record.listeners.delete(listener);
    }

    getState(identity: RequestIdentity): OperationState<unknown> | undefined {
        return this.states.get(this.stateKey(identity));
    }

    release(identity: RequestIdentity): RegistryReleaseResult {
        for (const [key, records] of this.records) {
            const index = records.findIndex((record) => sameOwner(record, identity));
            if (index < 0) continue;
            const [record] = records.splice(index, 1);
            this.releaseResources(record);
            const promoted = record.policy === 'queue' && index === 0 ? records[0] : undefined;
            if (promoted) {
                promoted.queued = false;
                promoted.onPromote?.();
            }
            if (records.length === 0) this.records.delete(key);
            return { released: true, ...(promoted ? { promoted } : {}) };
        }
        return { released: false };
    }

    cancel(key: string, identity: RequestIdentity, cause: CancelCause = 'user'): boolean {
        const record = this.records.get(key)?.find((candidate) => sameOwner(candidate, identity));
        return record ? this.cancelRecord(record, cause) : false;
    }

    registerCancellation(identity: RequestIdentity, handler: () => void): () => void {
        const record = this.getByIdentity(identity);
        if (!record) return () => undefined;
        record.cancellationHandlers.add(handler);
        let released = false;
        return () => {
            if (released) return;
            released = true;
            record.cancellationHandlers.delete(handler);
        };
    }

    clearCancellation(identity: RequestIdentity): void {
        this.getByIdentity(identity)?.cancellationHandlers.clear();
    }

    dispose(identity: RequestIdentity): boolean {
        const record = this.getByIdentity(identity);
        return record ? this.cancelRecord(record, 'disposed') : false;
    }

    private createRecord(key: string, policy: Concurrency, identity: RequestIdentity, queued: boolean): RegisteredOperation {
        return {
            key,
            policy,
            identity: { ...identity, generation: Math.max(++this.generation, identity.generation) },
            controller: new AbortController(),
            queued,
            cancelled: false,
            superseded: false,
            cancellationHandlers: new Set(),
            listeners: new Set(),
        };
    }

    private cancelRecord(record: RegisteredOperation, cause: CancelCause): boolean {
        if (record.cancelled) return false;
        record.cancelled = true;
        record.superseded = cause === 'superseded';
        this.abortResources(record);
        if (record.superseded) record.onSuperseded?.();
        this.release(record.identity);
        return true;
    }

    private abortResources(record: RegisteredOperation): void {
        if (!record.controller.signal.aborted) record.controller.abort();
        for (const handler of [...record.cancellationHandlers]) handler();
        record.cancellationHandlers.clear();
    }

    private releaseResources(record: RegisteredOperation): void {
        record.cancellationHandlers.clear();
        record.listeners.clear();
    }

    private stateKey(identity: RequestIdentity): string {
        return `${identity.operationId}:${identity.attemptId}:${identity.generation}`;
    }
}

export const applicationOperationRegistry = new OperationRegistry();
