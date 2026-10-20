import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores de marca provisionales: cambiarlos cuando RKeens defina su identidad.
        brand: {
          DEFAULT: '#111111',
          accent: '#C8A96A',
        },
      },
    },
  },
  plugins: [],
};

export default config;
