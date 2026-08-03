// resources/js/components/ui/popover.tsx
// FIX: previously this file imported from the standalone legacy package
// `@radix-ui/react-popover`, while the rest of this project's ui/
// components (button.tsx, select.tsx, dialog.tsx) already import from the
// unified `radix-ui` package (e.g. `import { Slot } from "radix-ui"`,
// `import { Select as SelectPrimitive } from "radix-ui"`).
//
// Having two different Radix packages installed side by side means TWO
// separate, independent copies of Radix's internal "dismissable layer"
// stack exist at runtime — one instance tracked by `radix-ui`, another by
// `@radix-ui/react-popover` — and neither knows the other exists. That's
// why adding `modal={false}` in the previous fix did NOT resolve the
// frozen-dialog bug: the Popover's cleanup (from the legacy package) was
// still stomping on `document.body.style.pointerEvents` independently of
// the Dialog's layer bookkeeping (from the unified package), because they
// are literally different module instances with different internal state.
//
// The real fix is to stop installing/importing the legacy package and use
// the same unified `radix-ui` package as everything else in this project,
// so Dialog and Popover share ONE layer stack and coordinate correctly.
import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-2xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-none dark:ring-foreground/10",
          "data-open:animate-in data-closed:animate-out",
          "data-closed:fade-out-0 data-open:fade-in-0",
          "data-closed:zoom-out-95 data-open:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
