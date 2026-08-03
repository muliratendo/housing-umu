// resources/js/components/Admin/shared/FilterBar.tsx
import React, { useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {config.map((c) =>
        c.type === 'search' ? (
          <div key={c.key} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-xs w-56"
              placeholder={c.placeholder}
              defaultValue={filters[c.key] ?? ''}
              onChange={(e) => apply(c.key, e.target.value)}
            />
          </div>
        ) : (
          <Select key={c.key} value={filters[c.key] ?? ''} onValueChange={(v) => apply(c.key, v === '__all' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder={c.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all" className="text-xs text-muted-foreground">All {c.label}</SelectItem>
              {c.options?.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      )}
      {hasActive && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={reset}>
          <X className="size-3" /> Clear
        </Button>
      )}
    </div>
  );
}