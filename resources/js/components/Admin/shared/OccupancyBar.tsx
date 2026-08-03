// resources/js/components/Admin/shared/OccupancyBar.tsx
import React from 'react';
interface Props { occupied: number; total: number; showText?: boolean; }
export default function OccupancyBar({ occupied, total, showText }: Props) {
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-[#137c41]';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {showText && <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{pct}%</span>}
    </div>
  );
}