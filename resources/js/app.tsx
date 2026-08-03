//resources/js/boostrap.ts

import '../css/app.css';
import './bootstrap';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

// 1. Import the routing helper from the official npm package
import { route } from 'ziggy-js';
// 2. Import your freshly generated static routes configuration file
import { Ziggy } from './ziggy';

// 3. Bind it globally, passing your routes file context into the initialization loop
window.route = (name: any, params: any, absolute: any, config: any) =>
    route(name, params, absolute, config || Ziggy);

const appName =
  window.document.getElementsByTagName('title')[0]?.innerText || 'HOusing@UMU';

createInertiaApp({
  title: (title) => (title ? `${title} | Housing@UMU` : 'Housing@UMU'),
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.tsx`,
      import.meta.glob('./Pages/**/*.tsx')
    ),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(<App {...props} />);
  },
  progress: {
    color: '#4B5563',
  },
});
