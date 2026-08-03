// resources/js/components/ui/date-picker.tsx
// Single-date calendar-popover picker, rebuilt on the new Calendar
// primitive (calendar.tsx) instead of react-day-picker — gives day/month/
// decade drill-down navigation, today highlighting, and full keyboard
// support for free, since Calendar implements all of that itself.
import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useRadixPointerEventsFix } from '@/hooks/use-radix-pointer-events-fix';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, min, max, placeholder = 'Select date', className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState(() => value ?? new Date());
  useRadixPointerEventsFix(open);

  // Keep the visible month in sync if `value` is set/cleared externally
  // (e.g. the parent form resets after submit).
  React.useEffect(() => {
    if (value) setDisplayMonth(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-9 text-sm',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          selected={value}
          min={min}
          max={max}
          ariaLabel="Choose a date"
          onDaySelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
