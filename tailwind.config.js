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
        xs: ['var(--fs-xs)', { lineHeight: 'var(--lh-normal)' }],
        sm: ['var(--fs-sm)', { lineHeight: 'var(--lh-normal)' }],
        base: ['var(--fs-md)', { lineHeight: 'var(--lh-normal)' }],
        lg: ['var(--fs-lg)', { lineHeight: 'var(--lh-normal)' }],
        xl: ['var(--fs-xl)', { lineHeight: 'var(--lh-tight)' }],
        '2xl': ['var(--fs-2xl)', { lineHeight: 'var(--lh-tight)' }],
        '3xl': ['var(--fs-3xl)', { lineHeight: 'var(--lh-tight)' }],
      },
    },
  },
  plugins: [],
};
