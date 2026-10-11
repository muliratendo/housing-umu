export type ModalLeaseResult =
    | { acquired: true; owner: string; release: () => void }
    | { acquired: false; owner: string };

export class ModalCoordinator {
    private owner?: string;

    acquire(owner: string): ModalLeaseResult {
        if (!this.owner) {
            this.owner = owner;
            return { acquired: true, owner, release: () => this.release(owner) };
        }
        if (this.owner === owner) return { acquired: true, owner, release: () => this.release(owner) };
        return { acquired: false, owner: this.owner };
    }

    release(owner: string): void {
        if (this.owner === owner) this.owner = undefined;
    }

    currentOwner(): string | undefined { return this.owner; }
}
