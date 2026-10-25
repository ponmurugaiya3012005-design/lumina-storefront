import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lumina Studio | Official Storefront',
  description: 'Handcrafted lighting & ceramic vessels crafted in limited batches.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
