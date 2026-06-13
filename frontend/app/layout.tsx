import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { WalletBar } from "./components/WalletBar";
import { Providers } from "./providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WalCup 26 — The Bitter Pundit · Album Stiker & Prediksi di Walrus Memory",
  description:
    "Arena prediksi Piala Dunia 2026 dengan agen AI yang mengingat segalanya — pick, opini, dan biasmu, tersimpan on-chain lewat Walrus Memory. Kumpulkan stiker, bangun album, dan agen berevolusi mengikutimu.",
};

const NAV: [string, string][] = [
  ["Beranda", "#top"],
  ["Cara Main", "#how"],
  ["Stiker", "#stickers"],
];

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface-container-low border-b border-outline-variant shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="#top" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo1.png" alt="WalCup 26" width={120} height={44} className="object-contain" priority />
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map(([t, h]) => (
              <a key={h} href={h} className="rounded-lg px-3 py-1.5 text-on-surface-variant hover:text-primary font-bold text-sm transition-colors">
                {t}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/play" className="hidden sm:inline-flex bg-primary text-white rounded-full px-5 py-2 font-bold text-sm hover:scale-105 transition-all shadow-sm">
              Prediksi
            </Link>
            <WalletBar />
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-outline-variant bg-surface-container-low py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logo1.png" alt="WalCup 26" width={90} height={33} className="object-contain opacity-70" />
          <p className="text-xs text-on-surface-variant text-center">
            The Bitter Pundit · Powered by{" "}
            <a href="https://memory.walrus.xyz" className="text-secondary hover:underline" target="_blank" rel="noopener noreferrer">Walrus Memory</a>
            {" · "}Built for{" "}
            <a href="https://thewalrussessions.wal.app" className="text-secondary hover:underline" target="_blank" rel="noopener noreferrer">Walrus Sessions 4</a>
          </p>
          <div className="flex gap-3 text-xs text-on-surface-variant">
            <a href="https://github.com/EzraNahumury/cakalele" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Docs</a>
            <span>·</span>
            <a href="#top" className="hover:text-primary transition-colors">#Walrus</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plusJakarta.variable} style={{ colorScheme: "light" }}>
      <body className={`${plusJakarta.className} paper-texture text-on-surface`}>
        <Providers>
          <Header />
          <main id="top" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
