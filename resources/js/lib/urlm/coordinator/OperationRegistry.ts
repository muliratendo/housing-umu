import type { CancelCause, Concurrency, OperationState, RequestIdentity } from '../core/contracts';
import { sameIdentity } from '../core/guards';

type Listener = (state: OperationState<unknown>) => void;

export interface RegisteredOperation {
    readonly key: string;
    readonly policy: Concurrency;
    readonly identity: RequestIdentity;
    readonly controller: AbortController;
    readonly cancellationHandlers: Set<() => void>;
    channel: LogicalChannel;
    queued: boolean;
    cancelled: boolean;
    superseded: boolean;
    onSuperseded?: () => void;
    onPromote?: () => void;
    onCancel?: (cause: CancelCause) => void;
}

interface LogicalChannel {
    readonly listeners: Set<Listener>;
    state?: OperationState<unknown>;
    terminal: boolean;
}

export type RegistryStartResult =
    | { kind: 'started'; record: RegisteredOperation }
    | { kind: 'joined'; record: RegisteredOperation }
    | { kind: 'queued'; record: RegisteredOperation; position: number };

export type RegistryReleaseResult = { released: boolean; promoted?: RegisteredOperation };
export type RegistryReplaceResult = { kind: 'replaced'; record: RegisteredOperation } | { kind: 'rejected' };

const safeCall = (callback: () => void): void => {
    try { callback(); } catch { /* callback failures cannot interrupt lifecycle cleanup */ }
};

const logicalKey = (identity: RequestIdentity): string =>
    `${identity.operationId}:${identity.correlationId}:${identity.idempotencyKey ?? ''}`;

export class OperationRegistry {
    private readonly records = new Map<string, RegisteredOperation[]>();
    private readonly channels = new Map<string, LogicalChannel>();
    private readonly terminalSnapshots = new Map<string, OperationState<unknown>>();
    private generation = 0;

    start(key: string, policy: Concurrency, identity: RequestIdentity): RegistryStartResult {
        const records = this.records.get(key) ?? [];
        if (policy === 'single_flight') {
            const active = records.find((record) => !record.cancelled);
            if (active) return { kind: 'joined', record: active };
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
        const index = records?.findIndex((record) => sameIdentity(record.identity, identity)) ?? -1;
        if (!records || index < 0) return { kind: 'rejected' };
        const previous = records[index];
        this.abortResources(previous);
        const replacement = this.createRecord(key, previous.policy, nextIdentity, previous.queued);
        replacement.channel = previous.channel;
        records[index] = replacement;
        return { kind: 'replaced', record: replacement };
    }

    getByIdentity(identity: RequestIdentity): RegisteredOperation | undefined {
        for (const records of this.records.values()) {
            const found = records.find((record) => sameIdentity(record.identity, identity));
            if (found) return found;
        }
        return undefined;
    }

    isCurrent(key: string, identity: RequestIdentity): boolean {
        const records = this.records.get(key);
        const record = records?.find((candidate) => sameIdentity(candidate.identity, identity));
        return !!record && !record.cancelled && (!record.queued || records?.[0] === record);
    }

    publish(identity: RequestIdentity, state: OperationState<unknown>): boolean {
        const record = this.getByIdentity(identity);
        if (!record || !sameIdentity(record.identity, identity) || record.cancelled) return false;
        record.channel.state = state;
        if (['succeeded', 'empty', 'validation_failed', 'auth_required', 'forbidden', 'conflicted', 'throttled', 'offline', 'timed_out', 'cancelled', 'failed', 'unknown_failure'].includes(state.status)) {
            record.channel.terminal = true;
            this.terminalSnapshots.set(logicalKey(identity), state);
            while (this.terminalSnapshots.size > 64) this.terminalSnapshots.delete(this.terminalSnapshots.keys().next().value as string);
        }
        for (const listener of [...record.channel.listeners]) safeCall(() => listener(state));
        return true;
    }

    observe(identity: RequestIdentity, listener: Listener): () => void {
        const record = this.getByIdentity(identity);
        const channel = record?.channel ?? this.channels.get(logicalKey(identity));
        if (!channel) return () => undefined;
        channel.listeners.add(listener);
        if (channel.state) safeCall(() => listener(channel.state as OperationState<unknown>));
        return () => channel.listeners.delete(listener);
    }

    getState(identity: RequestIdentity): OperationState<unknown> | undefined {
        return this.getByIdentity(identity)?.channel.state ?? this.terminalSnapshots.get(logicalKey(identity));
    }

    release(identity: RequestIdentity): RegistryReleaseResult {
        for (const [key, records] of this.records) {
            const index = records.findIndex((record) => sameIdentity(record.identity, identity));
            if (index < 0) continue;
            const [record] = records.splice(index, 1);
            this.releaseResources(record);
            const promoted = record.policy === 'queue' && index === 0 ? records[0] : undefined;
            if (promoted) {
                promoted.queued = false;
                safeCall(() => promoted.onPromote?.());
            }
            if (records.length === 0) this.records.delete(key);
            return { released: true, ...(promoted ? { promoted } : {}) };
        }
        return { released: false };
    }

    cancel(key: string, identity: RequestIdentity, cause: CancelCause = 'user'): boolean {
        const record = this.records.get(key)?.find((candidate) => sameIdentity(candidate.identity, identity));
        return record ? this.cancelRecord(record, cause) : false;
    }

    registerCancellation(identity: RequestIdentity, handler: () => void): () => void {
        const record = this.getByIdentity(identity);
        if (!record) return () => undefined;
        record.cancellationHandlers.add(handler);
        return () => record.cancellationHandlers.delete(handler);
    }

    clearCancellation(identity: RequestIdentity): void {
        this.getByIdentity(identity)?.cancellationHandlers.clear();
    }

    dispose(identity: RequestIdentity): boolean {
        const record = this.getByIdentity(identity);
        return record ? this.cancelRecord(record, 'disposed') : false;
    }

    activeRecordCount(): number { return [...this.records.values()].reduce((total, records) => total + records.length, 0); }
    terminalSnapshotCount(): number { return this.terminalSnapshots.size; }

    private createRecord(key: string, policy: Concurrency, identity: RequestIdentity, queued: boolean): RegisteredOperation {
        const channel = this.channels.get(logicalKey(identity)) ?? { listeners: new Set(), terminal: false };
        this.channels.set(logicalKey(identity), channel);
        return {
            key, policy, identity: { ...identity, generation: Math.max(++this.generation, identity.generation) },
            controller: new AbortController(), cancellationHandlers: new Set(), channel,
            queued, cancelled: false, superseded: false,
        };
    }

    private cancelRecord(record: RegisteredOperation, cause: CancelCause): boolean {
        if (record.cancelled) return false;
        record.superseded = cause === 'superseded';
        this.abortResources(record);
        safeCall(() => record.onCancel?.(cause));
        record.cancelled = true;
        if (record.superseded) safeCall(() => record.onSuperseded?.());
        this.release(record.identity);
        return true;
    }

    private abortResources(record: RegisteredOperation): void {
        if (!record.controller.signal.aborted) record.controller.abort();
        for (const handler of [...record.cancellationHandlers]) safeCall(handler);
        record.cancellationHandlers.clear();
    }

    private releaseResources(record: RegisteredOperation): void {
        record.cancellationHandlers.clear();
        if (record.channel.terminal) {
            record.channel.listeners.clear();
            this.channels.delete(logicalKey(record.identity));
        }
    }
}

export const applicationOperationRegistry = new OperationRegistry();
