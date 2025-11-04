import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chinese Dota 2 Tier 1 Players 2025',
  description:
    'Aggregated list of Chinese Dota 2 players who participated in Liquipedia Tier 1 tournaments during 2025.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
