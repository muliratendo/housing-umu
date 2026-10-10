// resources/js/components/Admin/shared/FilterBar.tsx
import React, { useCallback, useState } from 'react';
import { router } from '@inertiajs/react';
// FIX: `route()` was used below but never imported in the original file —
// this would have thrown a ReferenceError at runtime the moment any filter
// changed. Added the same Ziggy import used everywhere else in this codebase.
import { route } from 'ziggy-js';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';


interface FilterConfig {
  key: string; type: 'search' | 'select'; label: string;
  placeholder?: string; options?: { value: string; label: string }[];
}
interface Props { filters: Record<string, string>; routeName: string; config: FilterConfig[]; }


export default function FilterBar({ filters, routeName, config }: Props) {
  const apply = useCallback((key: string, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    router.get(route(routeName), next, { preserveState: true, replace: true });
  }, [filters, routeName]);


  const hasActive = Object.values(filters).some(Boolean);
  const reset = () => router.get(route(routeName), {}, { preserveState: false });


  // NEW: split config into the single search field (rendered as the big
  // centered YouTube-style search bar) and the select fields (rendered as
  // squircle "tablet" pills for quick role filtering, e.g. Role: student /
  // warden / admin...). This assumes at most one `search` entry in config,
  // which matches how FilterBar is used on the Admin Users page today.
  const searchConfig = config.find((c) => c.type === 'search');
  const selectConfigs = config.filter((c) => c.type === 'select');


  // NEW: local, controlled copy of the search input's value. This exists
  // purely so the "advanced filters" icon can conditionally render on the
  // right of the search bar the moment the admin starts typing — mirroring
  // YouTube's search bar, where the filter icon/button only shows up once
  // there's an active query. The actual filtering still goes through the
  // existing `apply()` -> router.get() flow on every keystroke, unchanged.
  const [searchValue, setSearchValue] = useState(searchConfig ? filters[searchConfig.key] ?? '' : '');
  const hasQuery = searchValue.trim().length > 0;


  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* ── Prominent, centered search bar (YouTube-style) ────────────────
          Wrapped in a max-width, centered container so it reads as the
          primary input on the page rather than one filter among many.
          The "advanced filters" icon (SlidersHorizontal) is absolutely
          positioned INSIDE the same rounded search field, on the far
          right, and only rendered once `hasQuery` is true — exactly like
          YouTube's filter icon, which is hidden until you've searched. */}
      {searchConfig && (
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            // NEW: squircle shape (rounded-2xl instead of the default
            // rounded-md/full) + taller height + generous left/right
            // padding to clear the search icon and the conditional filter
            // icon without them overlapping the typed text.
            className={`h-11 text-sm rounded-2xl pl-11 shadow-sm transition-all ${hasQuery ? 'pr-11' : 'pr-4'
              }`}
            placeholder={searchConfig.placeholder}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              apply(searchConfig.key, e.target.value);
            }}
          />


          {/* NEW: advanced-filters trigger. Only mounted once the admin has
              typed something, matching the requested YouTube behaviour
              where the filter icon appears at the right edge of the search
              bar after a query is entered. Opens a popover holding every
              `select`-type filter (currently just Role) as a fallback for
              any filter not already exposed as a squircle pill below. */}
          {hasQuery && selectConfigs.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Advanced filters"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <SlidersHorizontal className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                {selectConfigs.map((c) => (
                  <div key={c.key} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.options?.map((o) => {
                        const active = filters[c.key] === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => apply(c.key, active ? '' : o.value)}
                            className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-colors ${active
                                ? 'bg-[#137c41] text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                              }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}


      {/* ── Squircle "tablet" pills for role filtering ─────────────────────
          Always visible below the search bar (independent of hasQuery) so
          admins can filter by role at a glance without needing to type a
          search term first — this is the primary, always-available way to
          filter by role; the popover above is just a secondary path once
          a search is active, so both interactions stay in sync via the
          same `apply()` call and `filters` prop. */}
      {selectConfigs.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center justify-center gap-2">
          {c.options?.map((o) => {
            const active = filters[c.key] === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => apply(c.key, active ? '' : o.value)}
                // NEW: "squircle" shape — rounded-xl rather than a fully
                // circular pill or a sharp-cornered rectangle, matching the
                // requested tablet/squircle look.
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${active
                    ? 'border-[#137c41] bg-[#137c41] text-white'
                    : 'border-border bg-background text-muted-foreground hover:border-[#137c41]/50 hover:text-foreground'
                  }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ))}


      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => {
            setSearchValue('');
            reset();
          }}
        >
          <X className="size-3" /> Clear
        </Button>
      )}
    </div>
  );
}

