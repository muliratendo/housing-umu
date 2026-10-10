/**
 * =============================================================================
 * FILE: lib/requestState.ts
 * PURPOSE: Shared finite-state machine for ANY async UI region.
 *
 * WHY: Refactoring Guru principle "Replace Type Code with State" +
 * "Consolidate Conditional Expression". Instead of every component inventing
 * its own ad-hoc isLoading/error/data booleans (which drift out of sync and
 * cause impossible states like isLoading=true AND error=set), we define ONE
 * explicit state enum. Impossible states become unrepresentable.
 * =============================================================================
 */

export type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "refreshing"; data: T }
  | { status: "empty"; reasonCode: string }
  | { status: "error"; reasonCode: string; userMessage: string; retryable: boolean }
  | { status: "success"; data: T; stale?: boolean };

export const isLoading = <T,>(s: RequestState<T>) => s.status === "loading" || s.status === "refreshing";
export const isError = <T,>(s: RequestState<T>) => s.status === "error";
export const isEmptyState = <T,>(s: RequestState<T>) => s.status === "empty";
export const isSuccess = <T,>(s: RequestState<T>) => s.status === "success" || s.status === "refreshing";
