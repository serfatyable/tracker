import './globals.css';
import DevDiagnosticsBar from '../components/DevDiagnosticsBar';
import { cookies } from 'next/headers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const saved = cookieStore.get('i18n_lang')?.value;
  const lang: 'en' | 'he' = saved === 'he' ? 'he' : 'en';
  const dir: 'ltr' | 'rtl' = lang === 'he' ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <DevDiagnosticsBar />
      </body>
    </html>
  );
}
