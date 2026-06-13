import Image from "next/image";
import Link from "next/link";
import { TeamSticker } from "./components/TeamSticker";
import { RedirectIfConnected } from "./components/RedirectIfConnected";
import { ALL_TEAMS, TEAMS } from "./lib/data";

const STEPS = [
  { step: 1, title: "Connect & Collect", desc: "Connect your Sui wallet. Every prediction earns you a team sticker for your on-chain album — like Panini, but permanent.", tilt: "sticker-tilt-1", bg: "bg-primary text-white" },
  { step: 2, title: "Predict & Save", desc: "Pick winners, guess scores, drop hot takes. Every prediction is saved to Walrus Memory — on-chain, forever.", tilt: "sticker-tilt-2", bg: "bg-secondary-container text-on-secondary-container" },
  { step: 3, title: "The Agent Evolves", desc: "The AI remembers your history across sessions, detects your biases, and roasts your patterns. Day 1 ≠ Day 5.", tilt: "sticker-tilt-3", bg: "bg-tertiary text-white" },
];

const MINI_STATS = [
  { n: "1,240", label: "Players", primary: true },
  { n: "48", label: "Teams" },
  { n: "104", label: "Matches" },
  { n: "∞", label: "Memory" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <RedirectIfConnected />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant">
        <div className="relative grid lg:grid-cols-2 items-center gap-0 min-h-[540px]">
          <div className="relative flex items-center justify-center px-4 py-10 lg:py-4 overflow-hidden">
            <Image
              src="/banner1.png"
              alt="WalCup 26"
              width={780}
              height={620}
              className="float object-contain select-none drop-shadow-2xl w-full max-w-[480px] lg:max-w-[680px]"
              priority
            />
          </div>

          <div className="px-8 py-12 lg:px-12 space-y-6 z-10">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black leading-none tracking-tight text-on-surface">
                Predict.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-blue">Collect.</span>
                <br />
                Get Roasted.
                <span className="block text-base font-semibold text-on-surface-variant mt-1 tracking-normal">
                  powered by Walrus Memory
                </span>
              </h1>
              <p className="mt-4 text-on-surface-variant text-base leading-relaxed">
                The World Cup 2026 prediction arena with an AI agent that{" "}
                <strong className="text-on-surface">remembers everything</strong>. Your picks, opinions, and biases — stored on-chain via{" "}
                <strong className="text-on-surface">Walrus Memory</strong>. Collect stickers, build your album. The agent evolves with you.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Link href="/play" className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-7 py-3.5 font-bold hover:scale-105 shadow-lg rotate-1 transition-all active:scale-95">
                ⚽ Make a Prediction
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 bg-cyan-500 text-white border-2 border-cyan-500 rounded-xl px-7 py-3.5 font-bold hover:bg-cyan-600 hover:border-cyan-600 rotate-[-1deg] transition-all shadow-md">
                How It Works →
              </a>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2">
              {MINI_STATS.map(({ n, label, primary }) => (
                <div key={label} className="sticker-card sticker-tilt-1 peel-corner rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-black ${primary ? "text-primary" : "text-on-surface-variant"}`}>{n}</p>
                  <p className="text-xs text-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how" className="bg-surface-container rounded-3xl p-8 sm:p-12 space-y-6 scroll-mt-24">
        <h2 className="text-2xl font-black text-on-surface text-center">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map(({ step, title, desc, tilt, bg }) => (
            <div key={step} className={`sticker-card ${tilt} peel-corner rounded-2xl p-6 space-y-3 relative overflow-hidden`}>
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${bg}`}>{step}</div>
              <h3 className="text-lg font-bold text-on-surface">{title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STICKER STRIP (continuous auto-scroll) ───────── */}
      <section id="stickers" className="relative rounded-3xl overflow-hidden border border-outline-variant scroll-mt-24">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/imgs/bkg.png')" }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/25 to-white/55" aria-hidden="true" />
        <div className="relative py-10 space-y-6">
          <div className="text-center space-y-1 px-5 sm:px-8">
            <h2 className="text-2xl font-black text-on-surface">Sticker Collection — 48 Teams</h2>
            <p className="text-sm text-on-surface-variant">Collect every team in the World Cup 2026 for your album.</p>
          </div>

          <div className="marquee">
            <div className="marquee__track items-start py-2">
              {[...ALL_TEAMS, ...ALL_TEAMS].map((t, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-none">
                  <TeamSticker teamId={t} size="lg" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface bg-white/85 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {TEAMS[t]?.name ?? t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WALRUS BANNER ────────────────────────────────── */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-600">
        <div className="grid lg:grid-cols-2 items-center">
          <div className="px-8 py-10 space-y-4">
            <h2 className="text-3xl font-black text-white">Persistent memory. On-chain. Forever.</h2>
            <p className="text-blue-100 leading-relaxed">
              Every prediction is stored on Walrus. The agent builds a profile of your football brain across sessions — your biases, your streaks, your worst takes. Come back tomorrow, it still remembers.
            </p>
            <Link href="/play" className="inline-flex items-center gap-2 rounded-xl bg-secondary-container text-on-secondary-container px-6 py-3 font-bold hover:opacity-90 transition-opacity">
              Start Predicting →
            </Link>
          </div>
          <div className="hidden lg:flex justify-end overflow-hidden">
            <Image src="/imgs/image1.png" alt="WalCup player" width={500} height={340} className="float-delay object-contain" />
          </div>
        </div>
      </section>

    </div>
  );
}
