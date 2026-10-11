import type { Concurrency } from '../core/contracts';

export interface RegisteredOperation {
    operationId: string;
    generation: number;
    controller: AbortController;
    cancelled: boolean;
}

export class OperationRegistry {
    private readonly records = new Map<string, RegisteredOperation>();
    private generation = 0;

    start(key: string, policy: Concurrency, operationId: string): RegisteredOperation | undefined {
        const current = this.records.get(key);
        if (current && policy === 'single_flight') return current;
        if (current && policy === 'latest_wins') this.cancel(key, 'superseded');
        const record = { operationId, generation: ++this.generation, controller: new AbortController(), cancelled: false };
        this.records.set(key, record);
        return record;
    }

    get(key: string): RegisteredOperation | undefined { return this.records.get(key); }

    isCurrent(key: string, operationId: string, generation: number): boolean {
        const record = this.records.get(key);
        return record?.operationId === operationId && record.generation === generation && !record.cancelled;
    }

    cancel(key: string, _cause: 'user' | 'superseded' | 'disposed' = 'user'): void {
        const record = this.records.get(key);
        if (!record) return;
        record.cancelled = true;
        record.controller.abort();
        this.records.delete(key);
    }

    dispose(): void {
        for (const key of this.records.keys()) this.cancel(key, 'disposed');
    }
}
