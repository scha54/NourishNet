import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 configuration for the NourishNet frontend.
 *
 * Under Tailwind v4, design tokens (the `brand` 50–900 green scale and the
 * `success` / `warning` / `danger` semantic colours) are declared in the
 * `@theme` block of `src/index.css` using the CSS-custom-property syntax.
 *
 * This file is retained — and referenced from `src/index.css` via
 * `@config "../tailwind.config.ts"` — solely to pin an explicit `content`
 * glob covering every source file under `frontend/src`, satisfying the
 * requirement that content coverage is configured via `tailwind.config.ts`
 * rather than relying on v4 automatic source detection alone.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
