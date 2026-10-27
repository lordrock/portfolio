/** Tailwind is wired to the CSS design tokens so utilities and hand-written CSS stay in sync. */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
      },
      fontFamily: { serif: ['var(--font-serif)'], sans: ['var(--font-sans)'] },
    },
  },
  plugins: [],
};
