import { useEffect, useState, StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

function SubmitFixture() {
    const [submitted, setSubmitted] = useState(false);

    return (
        <form aria-label="Tooling smoke form" onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
        }}>
            <label htmlFor="smoke-name">Name</label>
            <input id="smoke-name" name="name" />
            <button type="submit">Submit form</button>
            {submitted && <p role="status">Submitted</p>}
        </form>
    );
}

function LifecycleFixture({ events }: { events: string[] }) {
    useEffect(() => {
        events.push('mounted');
        return () => { events.push('cleaned'); };
    }, [events]);
    return <p>Lifecycle fixture</p>;
}

describe('React integration test tooling', () => {
    it('renders TSX and supports accessible user-event submission', async () => {
        const user = userEvent.setup();
        render(<SubmitFixture />);

        expect(screen.getByRole('form', { name: 'Tooling smoke form' })).toBeTruthy();
        await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
        await user.click(screen.getByRole('button', { name: 'Submit form' }));

        expect(screen.getByRole('status').textContent).toBe('Submitted');
    });

    it('runs cleanup on unmount and tolerates StrictMode lifecycle probing', () => {
        const events: string[] = [];
        const { unmount } = render(
            <StrictMode>
                <LifecycleFixture events={events} />
            </StrictMode>,
        );

        expect(events).toContain('mounted');
        unmount();

        expect(events).toContain('cleaned');
        expect(events.filter((event) => event === 'cleaned').length)
            .toBe(events.filter((event) => event === 'mounted').length);
    });

    it('starts each test with an isolated DOM', () => {
        expect(screen.queryByRole('status')).toBeNull();
        render(<p role="status">Current test only</p>);
        expect(screen.getByRole('status').textContent).toBe('Current test only');
    });
});
