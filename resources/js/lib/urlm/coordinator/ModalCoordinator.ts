export type ModalLeaseResult =
    | { acquired: true; owner: string; leaseId: string; release: () => void }
    | { acquired: false; owner: string; leaseId: string };

let leaseSequence = 0;

export class ModalCoordinator {
    private lease?: { owner: string; leaseId: string };

    acquire(owner: string): ModalLeaseResult {
        if (this.lease) {
            if (this.lease.owner === owner) {
                // Re-acquisition is idempotent, but retains the original lease identity.
                const lease = this.lease;
                return { acquired: true, owner, leaseId: lease.leaseId, release: () => this.release(lease.leaseId) };
            }
            return { acquired: false, owner: this.lease.owner, leaseId: this.lease.leaseId };
        }
        const leaseId = `modal_${++leaseSequence}`;
        this.lease = { owner, leaseId };
        return { acquired: true, owner, leaseId, release: () => this.release(leaseId) };
    }

    release(leaseId: string): void {
        if (this.lease?.leaseId === leaseId) this.lease = undefined;
    }

    reset(): void { this.lease = undefined; }
    currentOwner(): string | undefined { return this.lease?.owner; }
}

export const applicationModalCoordinator = new ModalCoordinator();
