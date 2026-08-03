// resources/js/lib/maintenanceTransitions.ts
export const QUICK_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
  closed: [],
};

export const FULL_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['open'],
};
