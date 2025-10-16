import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';

import DevDiagnosticsBar from '../components/DevDiagnosticsBar';
import { I18nProvider } from '../lib/i18n/Provider';

export const metadata: Metadata = {
  title: {
    default: 'Tracker - Medical Residency Management',
    template: '%s | Tracker',
  },
  description:
    'A comprehensive platform for managing medical residency programs, rotations, on-call schedules, morning meetings, and reflections.',
  keywords: [
    'medical residency',
    'residency management',
    'rotations',
    'on-call',
    'medical education',
  ],
  authors: [{ name: 'Tracker Team' }],
  openGraph: {
    title: 'Tracker - Medical Residency Management',
    description: 'Manage your medical residency with ease',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saved = cookieStore.get('i18n_lang')?.value;
  const lang: 'en' | 'he' = saved === 'he' ? 'he' : 'en';
  const dir: 'ltr' | 'rtl' = lang === 'he' ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider>
          {children}
          <DevDiagnosticsBar />
        </I18nProvider>
      </body>
    </html>
  );
}
