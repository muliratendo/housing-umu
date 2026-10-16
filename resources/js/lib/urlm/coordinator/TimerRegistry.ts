import type { RequestIdentity } from '../core/contracts';
import { identityKey } from '../core/identity';

const ownerKey = identityKey;

export class TimerRegistry {
    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

    set(identity: RequestIdentity, callback: () => void, delayMs: number, isAuthoritative: () => boolean): void {
        this.clear(identity);
        const key = ownerKey(identity);
        this.timers.set(key, setTimeout(() => {
            this.timers.delete(key);
            if (isAuthoritative()) {
                try { callback(); } catch { /* watchdog failures cannot interrupt timer cleanup */ }
            }
        }, delayMs));
    }

    clear(identity: RequestIdentity): void {
        const key = ownerKey(identity);
        const timer = this.timers.get(key);
        if (timer !== undefined) clearTimeout(timer);
        this.timers.delete(key);
    }

    clearAllFor(operationId: string): void {
        for (const key of this.timers.keys()) {
            let matches = false;
            try { matches = JSON.parse(key)[0] === operationId; } catch { matches = false; }
            if (matches) {
                const timer = this.timers.get(key);
                if (timer !== undefined) clearTimeout(timer);
                this.timers.delete(key);
            }
        }
    }

    has(identity: RequestIdentity): boolean { return this.timers.has(ownerKey(identity)); }
}
