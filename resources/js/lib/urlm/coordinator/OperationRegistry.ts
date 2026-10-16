import type { CancelCause, Concurrency, OperationState, RequestIdentity } from '../core/contracts';
import { identityKey, logicalIdentityKey, sameIdentity } from '../core/identity';

type Listener = (state: OperationState<unknown>) => void;
type SafeCallback = () => void;

interface LogicalChannel {
    readonly key: string;
    readonly listeners: Set<Listener>;
    state?: OperationState<unknown>;
    terminalSnapshot?: OperationState<unknown>;
}

export interface RegisteredOperation {
    readonly key: string;
    readonly policy: Concurrency;
    readonly identity: RequestIdentity;
    readonly controller: AbortController;
    readonly cancellationHandlers: Set<SafeCallback>;
    channel: LogicalChannel;
    queued: boolean;
    cancelling: boolean;
    onSuperseded?: SafeCallback;
    onPromote?: SafeCallback;
    onCancel?: (cause: CancelCause) => void;
}

export type RegistryStartResult =
    | { kind: 'started'; record: RegisteredOperation }
    | { kind: 'joined'; record: RegisteredOperation }
    | { kind: 'queued'; record: RegisteredOperation; position: number };

export type RegistryReleaseResult = { released: boolean; promoted?: RegisteredOperation };
export type RegistryReplaceResult = { kind: 'replaced'; record: RegisteredOperation } | { kind: 'rejected' };

const terminalStatuses = new Set([
    'succeeded', 'empty', 'validation_failed', 'auth_required', 'forbidden',
    'conflicted', 'throttled', 'offline', 'timed_out', 'cancelled', 'failed',
    'unknown_failure',
]);

const safeCall = (callback: SafeCallback): void => {
    try { callback(); } catch { /* lifecycle cleanup is not callback-owned */ }
};

export class OperationRegistry {
    private readonly records = new Map<string, RegisteredOperation[]>();
    private readonly channels = new Map<string, LogicalChannel>();
    private readonly snapshots = new Map<string, OperationState<unknown>>();
    private generation = 0;

    start(key: string, policy: Concurrency, identity: RequestIdentity): RegistryStartResult {
        const records = this.records.get(key) ?? [];
        if (policy === 'single_flight') {
            const active = records.find((record) => !record.cancelling);
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

    reacquire(key: string, policy: Concurrency, identity: RequestIdentity): RegistryReplaceResult {
        const records = this.records.get(key) ?? [];
        if (records.some((record) => !sameIdentity(record.identity, identity))) return { kind: 'rejected' };
        const record = this.createRecord(key, policy, identity, false);
        records.push(record);
        this.records.set(key, records);
        return { kind: 'replaced', record };
    }

    getByIdentity(identity: RequestIdentity): RegisteredOperation | undefined {
        for (const records of this.records.values()) {
            const record = records.find((candidate) => sameIdentity(candidate.identity, identity));
            if (record) return record;
        }
        return undefined;
    }

    isCurrent(key: string, identity: RequestIdentity): boolean {
        const records = this.records.get(key);
        const record = records?.find((candidate) => sameIdentity(candidate.identity, identity));
        return !!record && !record.cancelling && (!record.queued || records?.[0] === record);
    }

    isCancelling(identity: RequestIdentity): boolean {
        return this.getByIdentity(identity)?.cancelling ?? false;
    }

    publish(identity: RequestIdentity, state: OperationState<unknown>): boolean {
        const record = this.getByIdentity(identity);
        if (!record || !sameIdentity(record.identity, identity) || record.cancelling) return false;
        record.channel.state = state;
        if (terminalStatuses.has(state.status)) {
            record.channel.terminalSnapshot = state;
            this.snapshots.set(record.channel.key, state);
            while (this.snapshots.size > 64) {
                const oldest = this.snapshots.keys().next().value;
                if (oldest === undefined) break;
                this.snapshots.delete(oldest);
            }
        }
        for (const listener of [...record.channel.listeners]) safeCall(() => listener(state));
        return true;
    }

    publishCancellation(identity: RequestIdentity, state: OperationState<unknown>): boolean {
        const record = this.getByIdentity(identity);
        if (!record || !record.cancelling || state.status !== 'cancelled') return false;
        record.channel.state = state;
        record.channel.terminalSnapshot = state;
        this.snapshots.set(record.channel.key, state);
        for (const listener of [...record.channel.listeners]) safeCall(() => listener(state));
        return true;
    }

    observe(identity: RequestIdentity, listener: Listener): () => void {
        const channel = this.channelFor(identity);
        if (!channel) return () => undefined;
        channel.listeners.add(listener);
        const snapshot = channel.state ?? channel.terminalSnapshot ?? this.snapshots.get(channel.key);
        if (snapshot) safeCall(() => listener(snapshot));
        return () => channel.listeners.delete(listener);
    }

    getState(identity: RequestIdentity): OperationState<unknown> | undefined {
        const channel = this.channelFor(identity);
        return channel?.state ?? channel?.terminalSnapshot ?? this.snapshots.get(logicalIdentityKey(identity));
    }

    release(identity: RequestIdentity): RegistryReleaseResult {
        for (const [key, records] of this.records) {
            const index = records.findIndex((record) => sameIdentity(record.identity, identity));
            if (index < 0) continue;
            const [record] = records.splice(index, 1);
            this.abortResources(record);
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

    registerCancellation(identity: RequestIdentity, handler: SafeCallback): () => void {
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

    activeRecordCount(): number { return [...this.records.values()].reduce((count, records) => count + records.length, 0); }
    channelCount(): number { return this.channels.size; }
    terminalSnapshotCount(): number { return this.snapshots.size; }

    private createRecord(key: string, policy: Concurrency, identity: RequestIdentity, queued: boolean): RegisteredOperation {
        const normalized: RequestIdentity = Object.freeze({
            ...identity,
            generation: Math.max(++this.generation, identity.generation),
        });
        const channelKey = logicalIdentityKey(normalized);
        const channel = this.channels.get(channelKey) ?? { key: channelKey, listeners: new Set<Listener>() };
        this.channels.set(channelKey, channel);
        return {
            key, policy, identity: normalized, controller: new AbortController(),
            cancellationHandlers: new Set(), channel, queued, cancelling: false,
        };
    }

    private channelFor(identity: RequestIdentity): LogicalChannel | undefined {
        return this.channels.get(logicalIdentityKey(identity));
    }

    private cancelRecord(record: RegisteredOperation, cause: CancelCause): boolean {
        if (record.cancelling) return false;
        record.cancelling = true;
        this.abortResources(record);
        safeCall(() => record.onCancel?.(cause));
        if (cause === 'superseded') safeCall(() => record.onSuperseded?.());
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
        const records = [...this.records.values()].some((items) => items.some((item) => item.channel === record.channel));
        if (!records && !record.channel.terminalSnapshot &&
            record.channel.state?.status !== 'awaiting_outcome') {
            record.channel.listeners.clear();
            this.channels.delete(record.channel.key);
        }
    }
}

export const applicationOperationRegistry = new OperationRegistry();
