import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from '@/components/layout/header';
import SiteFooter from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'PropCart Portal - Dự án Bất động sản',
  description: 'Khám phá các dự án bất động sản cao cấp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@photo-sphere-viewer/core@5.9.0/index.min.css"
          crossOrigin=""
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
