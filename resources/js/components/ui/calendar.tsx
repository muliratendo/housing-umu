// resources/js/components/ui/calendar.tsx
// NEW FILE: self-contained calendar primitive built from scratch (not a
// react-day-picker wrapper) because the requested behavior — independent
// day/month/decade drill-down navigation, today highlighting, full
// keyboard support (arrows, PageUp/Down, Enter), and two calendars that
// don't have to be on the same month — goes beyond what react-day-picker
// exposes cleanly out of the box. This one component is shared by both
// DatePicker (single) and DateRangePicker (two independent instances).
//
// Views (drill-down, like Ant Design / Google Calendar's zoom-out pattern):
//   'days'   — the familiar 7-column month grid. Clicking the title
//              ("July 2026") zooms OUT to 'months'.
//   'months' — a 3x4 grid of the 12 months in the displayed year. Clicking
//              a month zooms IN to 'days' for that month. Clicking the
//              title ("2026") zooms OUT to 'years'.
//   'years'  — a 3x4 grid of a 12-year span ("decade view"). Clicking a
//              year zooms IN to 'months' for that year.
//
// Keyboard support (WAI-ARIA grid pattern), active whenever the day grid
// has focus:
//   ArrowRight/Left — move focus one day forward/back
//   ArrowDown/Up    — move focus one week forward/back
//   PageDown/Up     — move focus one month forward/back (Shift+Page = year)
//   Home/End        — jump to start/end of the focused week
//   Enter/Space     — select the focused day
// Moving focus past the edge of the visible month automatically pages the
// calendar and keeps keyboard focus on the newly-focused day.
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function addYears(d: Date, n: number) { const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r; }
function startOfWeek(d: Date) { return addDays(d, -d.getDay()); }
function endOfWeek(d: Date) { return addDays(d, 6 - d.getDay()); }
function isInRange(d: Date, from?: Date, to?: Date) {
  if (!from || !to) return false;
  const t = startOfDay(d).getTime();
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
}
function isDisabled(d: Date, min?: Date, max?: Date) {
  if (min && startOfDay(d) < startOfDay(min)) return true;
  if (max && startOfDay(d) > startOfDay(max)) return true;
  return false;
}

// Builds the 42-cell (6-week) grid for a given month, including the
// trailing/leading days from adjacent months so the grid is always
// visually complete — those cells are shown dimmed and are not focusable.
function buildDayGrid(monthDate: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === monthDate.getMonth() };
  });
}

export type CalendarView = 'days' | 'months' | 'years';

export interface RangeHighlight {
  from?: Date;
  to?: Date;
}

interface CalendarProps {
  displayMonth: Date;
  onDisplayMonthChange: (date: Date) => void;
  selected?: Date;
  rangeHighlight?: RangeHighlight;
  onDaySelect: (date: Date) => void;
  min?: Date;
  max?: Date;
  className?: string;
  ariaLabel?: string;
}

export function Calendar({ displayMonth, onDisplayMonthChange, selected, rangeHighlight, onDaySelect, min, max, className, ariaLabel }: CalendarProps) {
  const [view, setView] = React.useState<CalendarView>('days');
  const today = startOfDay(new Date());

  // Roving tabindex target: the one day cell that is currently
  // keyboard-focusable. Defaults to the selected day, else today, else
  // the 1st of the displayed month.
  const [focusedDate, setFocusedDate] = React.useState<Date>(() => selected ?? (isSameDay(startOfDay(today), today) ? today : displayMonth));
  const cellRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (pendingFocusKey.current) {
      const el = cellRefs.current.get(pendingFocusKey.current);
      el?.focus();
      pendingFocusKey.current = null;
    }
  });

  const goToDay = (date: Date) => {
    setFocusedDate(date);
    if (date.getMonth() !== displayMonth.getMonth() || date.getFullYear() !== displayMonth.getFullYear()) {
      onDisplayMonthChange(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    pendingFocusKey.current = date.toDateString();
  };

  const handleKeyDown = (e: React.KeyboardEvent, date: Date) => {
    const map: Record<string, () => void> = {
      ArrowRight: () => goToDay(addDays(date, 1)),
      ArrowLeft: () => goToDay(addDays(date, -1)),
      ArrowDown: () => goToDay(addDays(date, 7)),
      ArrowUp: () => goToDay(addDays(date, -7)),
      PageDown: () => goToDay(e.shiftKey ? addYears(date, 1) : addMonths(date, 1)),
      PageUp: () => goToDay(e.shiftKey ? addYears(date, -1) : addMonths(date, -1)),
      Home: () => goToDay(startOfWeek(date)),
      End: () => goToDay(endOfWeek(date)),
      Enter: () => { if (!isDisabled(date, min, max)) onDaySelect(date); },
      ' ': () => { if (!isDisabled(date, min, max)) onDaySelect(date); },
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  };

  // ── Header: title text + zoom-out behavior + prev/next scoped to view ──
  const title =
    view === 'days' ? `${MONTH_NAMES[displayMonth.getMonth()]} ${displayMonth.getFullYear()}`
      : view === 'months' ? `${displayMonth.getFullYear()}`
        : (() => { const start = Math.floor(displayMonth.getFullYear() / 10) * 10 - 1; return `${start} – ${start + 11}`; })();

  const step = (dir: 1 | -1) => {
    if (view === 'days') onDisplayMonthChange(addMonths(displayMonth, dir));
    else if (view === 'months') onDisplayMonthChange(addYears(displayMonth, dir));
    else onDisplayMonthChange(addYears(displayMonth, dir * 12));
  };

  const zoomOut = () => setView((v) => (v === 'days' ? 'months' : v === 'months' ? 'years' : v));

  return (
    <div className={cn('w-[280px] select-none', className)} role="application" aria-label={ariaLabel ?? 'Calendar'}>
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <button
          type="button"
          aria-label={view === 'days' ? 'Previous month' : view === 'months' ? 'Previous year' : 'Previous decade'}
          onClick={() => step(-1)}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={view === 'years'}
          className="rounded-md px-2 py-1 text-sm font-medium hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
        >
          {title}
        </button>
        <button
          type="button"
          aria-label={view === 'days' ? 'Next month' : view === 'months' ? 'Next year' : 'Next decade'}
          onClick={() => step(1)}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {view === 'days' && (
        <div role="grid" className="px-2 pb-2">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground">{w}</div>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div role="row" key={week} className="grid grid-cols-7">
              {buildDayGrid(displayMonth).slice(week * 7, week * 7 + 7).map(({ date, inMonth }) => {
                const disabled = isDisabled(date, min, max);
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, selected);
                const inSpan = isInRange(date, rangeHighlight?.from, rangeHighlight?.to);
                const isEndpoint = isSameDay(date, rangeHighlight?.from) || isSameDay(date, rangeHighlight?.to);
                const key = date.toDateString();
                const isFocusTarget = isSameDay(date, focusedDate);
                return (
                  <button
                    key={key}
                    ref={(el) => { if (el) cellRefs.current.set(key, el); else cellRefs.current.delete(key); }}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected || isEndpoint}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={disabled || undefined}
                    tabIndex={inMonth && isFocusTarget ? 0 : -1}
                    disabled={!inMonth || disabled}
                    onFocus={() => setFocusedDate(date)}
                    onClick={() => onDaySelect(date)}
                    onKeyDown={(e) => handleKeyDown(e, date)}
                    className={cn(
                      'relative flex h-8 w-8 items-center justify-center rounded-full text-sm outline-none transition-colors mx-auto',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      !inMonth && 'pointer-events-none text-transparent',
                      inMonth && !disabled && 'hover:bg-muted cursor-pointer',
                      inMonth && disabled && 'text-muted-foreground/40 cursor-not-allowed',
                      inSpan && !isEndpoint && 'bg-[#137c41]/15 rounded-none w-full',
                      (isSelected || isEndpoint) && 'bg-[#137c41] text-white hover:bg-[#0b4b27]',
                      isToday && !isSelected && !isEndpoint && 'font-semibold text-[#137c41] ring-1 ring-[#137c41]/50',
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1 p-2">
          {MONTH_NAMES.map((m, i) => {
            const isCurrent = today.getMonth() === i && today.getFullYear() === displayMonth.getFullYear();
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onDisplayMonthChange(new Date(displayMonth.getFullYear(), i, 1)); setView('days'); }}
                className={cn(
                  'rounded-md py-2 text-sm hover:bg-muted',
                  isCurrent && 'font-semibold text-[#137c41] ring-1 ring-[#137c41]/50',
                )}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1 p-2">
          {Array.from({ length: 12 }, (_, i) => Math.floor(displayMonth.getFullYear() / 10) * 10 - 1 + i).map((y) => {
            const isCurrent = today.getFullYear() === y;
            return (
              <button
                key={y}
                type="button"
                onClick={() => { onDisplayMonthChange(new Date(y, displayMonth.getMonth(), 1)); setView('months'); }}
                className={cn(
                  'rounded-md py-2 text-sm hover:bg-muted',
                  isCurrent && 'font-semibold text-[#137c41] ring-1 ring-[#137c41]/50',
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
