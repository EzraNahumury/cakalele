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
  title: "WalCup 26 — The Bitter Pundit · Sticker Album & Predictions on Walrus Memory",
  description:
    "World Cup 2026 prediction arena with an AI agent that remembers everything — your picks, opinions, and biases, stored on-chain via Walrus Memory. Collect stickers, build your album, and watch the agent evolve with you.",
};

const NAV: [string, string][] = [
  ["Home", "#top"],
  ["How It Works", "#how"],
  ["Stickers", "#stickers"],
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
              Predict
            </Link>
            <WalletBar />
          </div>
        </div>
      </div>
    </header>
  );
}

const PUNDIT_PACKAGE = "0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f";

type FooterLink = { label: string; href: string; external?: boolean };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-wider text-on-surface mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {links.map(({ label, href, external }) => (
          <li key={label}>
            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                {label}
              </a>
            ) : (
              <Link href={href} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="space-y-4">
            <Image src="/logo1.png" alt="The Bitter Pundit — WalCup 26" width={132} height={48} className="object-contain" />
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
              An arrogant AI football pundit that saves every prediction you make as on-chain proof on Walrus —
              then holds you to it when you&apos;re wrong. Permanent memory you can&apos;t delete.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full bg-tertiary text-white px-3 py-1 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Live · Walrus Mainnet
            </span>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Make a Prediction", href: "/play" },
              { label: "How It Works", href: "/#how" },
              { label: "Sticker Collection", href: "/#stickers" },
            ]}
          />
          <FooterColumn
            title="Technology"
            links={[
              { label: "Walrus Memory", href: "https://memory.walrus.xyz", external: true },
              { label: "Walrus Protocol", href: "https://walrus.xyz", external: true },
              { label: "Sui Blockchain", href: "https://sui.io", external: true },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "GitHub Repo", href: "https://github.com/EzraNahumury/cakalele", external: true },
              { label: "Smart Contract ↗", href: `https://suiscan.xyz/mainnet/object/${PUNDIT_PACKAGE}`, external: true },
              { label: "Walrus Sessions 4", href: "https://thewalrussessions.wal.app", external: true },
            ]}
          />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant text-center sm:text-left">
            © 2026 The Bitter Pundit · Built for Walrus Sessions 4 · MIT License
          </p>
          <div className="flex items-center gap-4 text-xs">
            <a
              href="https://x.com/search?q=%23Walrus"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              #Walrus on X
            </a>
            <span className="text-on-surface-variant">Powered by Walrus Memory 🐋</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable} style={{ colorScheme: "light" }}>
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
