// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Wird bei Domain-Entscheid (PLAN.md 5.3) auf die produktive URL gesetzt.
  site: 'https://raetselheft.ch',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'de-CH',
    locales: ['de-CH'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
