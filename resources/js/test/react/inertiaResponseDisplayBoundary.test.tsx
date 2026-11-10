import { afterEach, describe, expect, it } from 'vitest';
import {
    installInertiaResponseDisplayBoundary,
    inertiaResponseDisplayBoundaryMessage,
} from '../../lib/inertiaResponseDisplayBoundary';

const invalidEvent = (detail: unknown) => new CustomEvent('inertia:invalid', {
    cancelable: true,
    detail,
});

afterEach(() => {
    installInertiaResponseDisplayBoundary()();
    document.getElementById('inertia-response-display-boundary')?.remove();
});

describe('Inertia response display boundary', () => {
    it('cancels invalid display and renders only fixed safe feedback', () => {
        const teardown = installInertiaResponseDisplayBoundary();
        const marker = '<script>hostile-response</script>';
        const event = invalidEvent({ response: { data: marker, headers: { secret: marker } } });

        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(document.body.textContent).toContain(inertiaResponseDisplayBoundaryMessage);
        expect(document.body.textContent).not.toContain(marker);
        teardown();
    });

    it('is singleton, prevents duplicate overlays, and teardown removes only its listener', () => {
        const firstTeardown = installInertiaResponseDisplayBoundary();
        const secondTeardown = installInertiaResponseDisplayBoundary();
        const unrelated = () => undefined;
        document.addEventListener('inertia:invalid', unrelated);

        document.dispatchEvent(invalidEvent({ response: { data: 'first' } }));
        document.dispatchEvent(invalidEvent({ response: { data: 'second' } }));

        expect(firstTeardown).toBe(secondTeardown);
        expect(document.querySelectorAll('#inertia-response-display-boundary')).toHaveLength(1);

        firstTeardown();
        const afterTeardown = invalidEvent({ response: { data: 'after-teardown' } });
        document.dispatchEvent(afterTeardown);

        expect(afterTeardown.defaultPrevented).toBe(false);
        expect(document.getElementById('inertia-response-display-boundary')).toBeNull();
        document.removeEventListener('inertia:invalid', unrelated);
    });

    it('leaves exception propagation unchanged and does not expose exception data', () => {
        installInertiaResponseDisplayBoundary();
        const marker = 'hostile-exception';
        const event = new CustomEvent('inertia:exception', {
            cancelable: true,
            detail: { exception: new Error(marker), request: { password: marker } },
        });

        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.body.textContent).not.toContain(marker);
        expect(document.getElementById('inertia-response-display-boundary')).toBeNull();
    });
});
