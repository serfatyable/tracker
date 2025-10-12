import "./globals.css";
import DevDiagnosticsBar from "../components/DevDiagnosticsBar";
import { I18nProvider } from "../lib/i18n/Provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const lang: 'en' | 'he' = 'en';
	const dir: 'ltr' | 'rtl' = 'ltr';
	return (
		<html lang={lang} dir={dir} suppressHydrationWarning>
			<body suppressHydrationWarning>
				<I18nProvider>
					{children}
				</I18nProvider>
				<DevDiagnosticsBar />
			</body>
		</html>
	);
}
