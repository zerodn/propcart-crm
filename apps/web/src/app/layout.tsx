import type { Metadata } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PropCart CRM',
  description: 'Quản lý bất động sản đa tenant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="font-body">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" closeButton />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
