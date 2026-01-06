import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VidSense - AI Video Understanding',
  description: 'Upload any short video and get comprehensive AI understanding in minutes. VidSense deeply analyzes video content and answers your questions.',
  keywords: ['video analysis', 'AI', 'video understanding', 'video intelligence', 'machine learning'],
  authors: [{ name: 'Foyzul Karim' }],
  openGraph: {
    title: 'VidSense - AI Video Understanding',
    description: 'Upload any short video and get comprehensive AI understanding in minutes.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="flex min-h-screen flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
