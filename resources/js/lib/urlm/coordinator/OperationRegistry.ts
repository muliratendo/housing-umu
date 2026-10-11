import type { CancelCause, Concurrency, RequestIdentity } from '../core/contracts';

export interface RegisteredOperation {
    readonly key: string;
    readonly policy: Concurrency;
    readonly identity: RequestIdentity;
    readonly controller: AbortController;
    queued: boolean;
    cancelled: boolean;
    superseded: boolean;
    readonly cancellationHandlers: Set<() => void>;
    onSuperseded?: () => void;
}

export type RegistryStartResult =
    | { kind: 'started'; record: RegisteredOperation }
    | { kind: 'joined'; record: RegisteredOperation }
    | { kind: 'queued'; record: RegisteredOperation; position: number };

export type RegistryReleaseResult = { released: boolean; promoted?: RegisteredOperation };

const sameOwner = (a: RegisteredOperation, identity: RequestIdentity): boolean =>
    a.identity.operationId === identity.operationId &&
    a.identity.attemptId === identity.attemptId &&
    a.identity.generation === identity.generation;

export class OperationRegistry {
    private readonly records = new Map<string, RegisteredOperation[]>();
    private generation = 0;

    start(key: string, policy: Concurrency, identity: RequestIdentity): RegistryStartResult {
        const records = this.records.get(key) ?? [];
        if (policy === 'single_flight') {
            const active = records[0];
            if (active && !active.cancelled) return { kind: 'joined', record: active };
        }
        if (policy === 'latest_wins') {
            for (const record of [...records]) this.cancelRecord(record, 'superseded');
            records.length = 0;
        }
        const record: RegisteredOperation = {
            key,
            policy,
            identity: { ...identity, generation: Math.max(++this.generation, identity.generation) },
            controller: new AbortController(),
            queued: policy === 'queue' && records.length > 0,
            cancelled: false,
            superseded: false,
            cancellationHandlers: new Set(),
        };
        records.push(record);
        this.records.set(key, records);
        return record.queued
            ? { kind: 'queued', record, position: records.length - 1 }
            : { kind: 'started', record };
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
        const record = this.records.get(key)?.find((candidate) => sameOwner(candidate, identity));
        return !!record && !record.cancelled && (!record.queued || this.records.get(key)?.[0] === record);
    }

    release(identity: RequestIdentity): RegistryReleaseResult {
        for (const [key, records] of this.records) {
            const index = records.findIndex((record) => sameOwner(record, identity));
            if (index < 0) continue;
            const [record] = records.splice(index, 1);
            this.releaseHandlers(record);
            // Only the exact owner may release a record; queue promotion is FIFO.
            const promoted = record.policy === 'queue' && index === 0 ? records[0] : undefined;
            if (promoted) promoted.queued = false;
            if (records.length === 0) this.records.delete(key);
            return { released: true, ...(promoted ? { promoted } : {}) };
        }
        return { released: false };
    }

    cancel(key: string, identity: RequestIdentity, cause: CancelCause = 'user'): boolean {
        const record = this.records.get(key)?.find((candidate) => sameOwner(candidate, identity));
        if (!record) return false;
        this.cancelRecord(record, cause);
        return true;
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

    dispose(identity: RequestIdentity): boolean {
        const record = this.getByIdentity(identity);
        return record ? this.cancelRecord(record, 'disposed') : false;
    }

    private cancelRecord(record: RegisteredOperation, cause: CancelCause): boolean {
        if (record.cancelled) return false;
        record.cancelled = true;
        record.superseded = cause === 'superseded';
        if (!record.controller.signal.aborted) record.controller.abort();
        for (const handler of [...record.cancellationHandlers]) handler();
        record.cancellationHandlers.clear();
        if (record.superseded) record.onSuperseded?.();
        this.release(record.identity);
        return true;
    }

    private releaseHandlers(record: RegisteredOperation): void {
        record.cancellationHandlers.clear();
    }
}

export const applicationOperationRegistry = new OperationRegistry();
