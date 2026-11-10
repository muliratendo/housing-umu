import { router } from '@inertiajs/core';

const BOUNDARY_ID = 'inertia-response-display-boundary';
const MESSAGE = 'We received an unexpected response. The request result may not be confirmed.';

let removeInvalidListener: (() => void) | undefined;

const showBoundaryMessage = (): void => {
    if (typeof document === 'undefined') return;

    let boundary = document.getElementById(BOUNDARY_ID);
    if (boundary) return;

    boundary = document.createElement('div');
    boundary.id = BOUNDARY_ID;
    boundary.setAttribute('role', 'alert');
    boundary.setAttribute('aria-live', 'assertive');
    boundary.setAttribute('tabindex', '-1');
    boundary.textContent = MESSAGE;
    Object.assign(boundary.style, {
        position: 'fixed',
        inset: '1rem',
        zIndex: '2147483647',
        padding: '1rem',
        background: '#ffffff',
        color: '#111827',
        border: '2px solid #b91c1c',
        borderRadius: '0.5rem',
        boxShadow: '0 0.5rem 1.5rem rgba(0, 0, 0, 0.2)',
    });
    document.body.appendChild(boundary);
    boundary.focus();
};

export const installInertiaResponseDisplayBoundary = (): (() => void) => {
    if (removeInvalidListener) return removeInvalidListener;

    const removeListener = router.on('invalid', (event) => {
        event.preventDefault();
        showBoundaryMessage();
    });
    const teardown = () => {
        removeListener();
        if (typeof document !== 'undefined') {
            document.getElementById(BOUNDARY_ID)?.remove();
        }
        removeInvalidListener = undefined;
    };
    removeInvalidListener = teardown;
    return teardown;
};

export const inertiaResponseDisplayBoundaryMessage = MESSAGE;
