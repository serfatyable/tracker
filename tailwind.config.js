/**** TailwindCSS configuration ****/
module.exports = {
  darkMode: 'media',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        elev1: 'var(--elev-1)',
        elev2: 'var(--elev-2)',
      },
      transitionTimingFunction: { ease: 'var(--ease)' },
      transitionDuration: { 150: 'var(--dur-1)', 200: 'var(--dur-2)' },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      fontSize: {
        /* Clamp-based sizes to scale slightly with viewport while respecting tokens */
        xs: ['clamp(0.75rem, 0.72rem + 0.2vw, var(--fs-xs))', { lineHeight: 'var(--lh-normal)' }],
        sm: ['clamp(0.875rem, 0.84rem + 0.2vw, var(--fs-sm))', { lineHeight: 'var(--lh-normal)' }],
        base: ['clamp(1rem, 0.96rem + 0.2vw, var(--fs-md))', { lineHeight: 'var(--lh-normal)' }],
        lg: ['clamp(1.125rem, 1.08rem + 0.2vw, var(--fs-lg))', { lineHeight: 'var(--lh-normal)' }],
        xl: ['clamp(1.25rem, 1.18rem + 0.2vw, var(--fs-xl))', { lineHeight: 'var(--lh-tight)' }],
        '2xl': ['clamp(1.5rem, 1.42rem + 0.3vw, var(--fs-2xl))', { lineHeight: 'var(--lh-tight)' }],
        '3xl': [
          'clamp(1.875rem, 1.8rem + 0.4vw, var(--fs-3xl))',
          { lineHeight: 'var(--lh-tight)' },
        ],
      },
    },
  },
  plugins: [],
};
