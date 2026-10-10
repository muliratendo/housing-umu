// resources/js/lib/http.ts
// PURPOSE: Safe same-origin HTTP helper for Laravel session + CSRF requests.

function getCookie(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Requests Laravel's CSRF cookie before a login or other write request.
 * Call once before POST, PUT, PATCH, or DELETE requests when using Sanctum.
 */
export async function initialiseCsrf(): Promise<void> {
  const response = await fetch("/sanctum/csrf-cookie", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw {
      status: response.status,
      message: "Could not prepare the secure login request.",
    };
  }
}

/**
 * Makes a same-origin JSON request to Laravel with session cookies and CSRF.
 */
export async function laravelFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const xsrfToken = getCookie("XSRF-TOKEN");

  return fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
      ...(options.headers ?? {}),
    },
  });
}
