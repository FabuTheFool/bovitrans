import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta BoviTrans — verde campo + acentos cálidos
        brand: {
          50:  '#f0f9f1',
          100: '#dceedf',
          200: '#bbdcc1',
          300: '#8ec39a',
          400: '#5ea571',
          500: '#3d8954',
          600: '#2d6d43',
          700: '#255738',
          800: '#1f462f',
          900: '#1a3a27',
        },
        status: {
          pendiente:  '#eab308',
          asignada:   '#2563eb',
          en_curso:   '#7c3aed',
          completada: '#16a34a',
          cancelada:  '#6b7280',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
