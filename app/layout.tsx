import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Diongue-IziSchool — Générateur d'Emploi du Temps IA & Algorithmique",
  description: "Conception et génération intelligente d'emplois du temps optimisés sous contraintes pour Diongue-IziSchool.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
