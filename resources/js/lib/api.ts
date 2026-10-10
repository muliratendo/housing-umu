// resources/js/lib/api.ts
export async function apiFetch(
  url: string,
  options: RequestInit = {},
) {
  return fetch(url, {
    credentials: 'same-origin', // use 'include' only for a different origin
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });
}
