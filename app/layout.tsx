import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Planora — Générateur d'Emploi du Temps Intelligent IA & SaaS",
  description: "Conception et génération intelligente d'emplois du temps optimisés sans conflit pour collèges, lycées et établissements d'enseignement.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
