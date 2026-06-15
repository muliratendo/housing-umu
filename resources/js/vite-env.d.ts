/// <reference types="vite/client" />

interface Window {
    axios: any;
    route: typeof routeFn; // 👈 Exposes route inside window.route
}

declare global {
  var route: typeof routeFn; // 👈 Exposes route() globally in TSX files
}
