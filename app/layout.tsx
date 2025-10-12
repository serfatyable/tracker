import './globals.css';
import DevDiagnosticsBar from '../components/DevDiagnosticsBar';
import { I18nProvider } from '../lib/i18n/Provider';
import { cookies } from 'next/headers';

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
