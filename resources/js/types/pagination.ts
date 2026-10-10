/**
 * Generic Laravel paginator payload delivered to Inertia pages.
 *
 * Keeps all paginated page props compatible with the reusable DataTable
 * component and avoids duplicating slightly different Paginator interfaces.
 */
export interface LaravelPaginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
  total: number;
  prev_page_url: string | null;
  next_page_url: string | null;
}
