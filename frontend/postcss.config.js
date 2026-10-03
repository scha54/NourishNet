export default {
  plugins: {
    // Tailwind CSS v4 ships its PostCSS integration in a dedicated package.
    // Vendor prefixing is handled internally by Tailwind v4, so a separate
    // `autoprefixer` plugin is no longer required.
    '@tailwindcss/postcss': {},
  },
};
