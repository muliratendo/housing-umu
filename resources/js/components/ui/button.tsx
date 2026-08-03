// resources/js/components/ui/button.tsx
// FIX: root cause of "Function components cannot be given refs" warnings
// AND very likely the real cause of the dialog-freeze bug. This component
// was a plain function component. Every place it's used with `asChild`
// (DialogTrigger asChild, PopoverTrigger asChild, DropdownMenuTrigger
// asChild, SheetTrigger asChild) relies on Radix's <Slot> cloning this
// element and attaching a ref to its actual DOM node — Popper positioning,
// focus-trap scoping, and pointer-event/dismissable-layer bookkeeping all
// depend on that ref resolving to a real <button> element. A plain
// function component cannot receive a ref at all (React silently drops
// it), so every one of those internal Radix mechanisms was operating on a
// null ref. That's consistent with the freeze happening specifically after
// interacting with elements that use asChild triggers, and not clearing
// even with `modal={false}` alone.
//
// Fix: wrap the component in React.forwardRef and forward the ref to the
// underlying <Comp> (button or Slot when asChild is used). This is the
// standard shadcn/ui Button implementation.
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// FIX: React.forwardRef wrapper — this is the change that resolves the
// "Function components cannot be given refs" warning at its source, for
// every consumer of Button across the whole app (Dialog, Popover,
// DropdownMenu, Sheet triggers all use asChild with this component).
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
