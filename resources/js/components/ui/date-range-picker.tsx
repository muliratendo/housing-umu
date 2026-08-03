// resources/js/components/ui/date-range-picker.tsx
// Range picker rebuilt on the new Calendar primitive with TWO
// INDEPENDENT calendar instances (a "start" calendar and an "end"
// calendar), matching booking/event-management UX (e.g. Booking.com,
// Google Calendar's event range picker) rather than react-day-picker's
// default two-months-side-by-side-and-locked-together behavior.
//
// Interaction model:
//   1. Click a day in the "Start date" calendar -> sets `from`, clears
//      `to` if it's now before the new `from`.
//   2. Click a day in the "End date" calendar -> sets `to` (only allowed
//      if `to >= from`; the end calendar disables days before `from`).
//   3. Both calendars independently page through months/years — the user
//      can leave "Start date" on March while browsing "End date" all the
//      way to November, since real academic terms often span many months.
//   4. The FULL span between `from` and `to` is highlighted with a
//      continuous colored bar across BOTH calendars (via Calendar's
//      `rangeHighlight` prop) wherever either happens to be showing a
//      month that falls inside the range — visualizing the entire
//      selected duration, not just whatever's visible in one grid.
import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useRadixPointerEventsFix } from '@/hooks/use-radix-pointer-events-fix';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [startMonth, setStartMonth] = React.useState(() => value?.from ?? new Date());
  const [endMonth, setEndMonth] = React.useState(() => value?.to ?? value?.from ?? new Date());
  useRadixPointerEventsFix(open);

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
      : format(value.from, 'MMM d, yyyy')
    : 'Select date range';

  const selectStart = (date: Date) => {
    const nextTo = value?.to && date > value.to ? undefined : value?.to;
    onChange({ from: date, to: nextTo });
  };

  const selectEnd = (date: Date) => {
    if (value?.from && date < value.from) return; // end calendar already disables these, but guard anyway
    onChange({ from: value?.from, to: date });
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-9 text-sm',
            !value?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x">
          <div>
            <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">Start date</p>
            <Calendar
              displayMonth={startMonth}
              onDisplayMonthChange={setStartMonth}
              selected={value?.from}
              rangeHighlight={value}
              max={value?.to}
              ariaLabel="Choose a start date"
              onDaySelect={selectStart}
            />
          </div>
          <div className="flex items-center justify-center sm:hidden py-1">
            <ArrowRight className="size-4 text-muted-foreground rotate-90" />
          </div>
          <div>
            <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">End date</p>
            <Calendar
              displayMonth={endMonth}
              onDisplayMonthChange={setEndMonth}
              selected={value?.to}
              rangeHighlight={value}
              min={value?.from}
              ariaLabel="Choose an end date"
              onDaySelect={selectEnd}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
