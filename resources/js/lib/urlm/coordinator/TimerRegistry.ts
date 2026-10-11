export class TimerRegistry {
    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

    set(operationId: string, callback: () => void, delayMs: number): void {
        this.clear(operationId);
        this.timers.set(operationId, setTimeout(() => {
            this.timers.delete(operationId);
            callback();
        }, delayMs));
    }

    clear(operationId: string): void {
        const timer = this.timers.get(operationId);
        if (timer !== undefined) clearTimeout(timer);
        this.timers.delete(operationId);
    }

    clearAll(): void {
        for (const operationId of this.timers.keys()) this.clear(operationId);
    }

    has(operationId: string): boolean { return this.timers.has(operationId); }
}
