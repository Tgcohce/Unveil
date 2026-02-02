import { Link } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { ParticleSphereScene } from "./components/ParticleSphereScene";

function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ fontFamily: '"Noto Sans", sans-serif' }} className="text-2xl text-zen-text-sub">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col antialiased overflow-x-hidden relative selection:bg-zen-indigo/20"
      style={{ fontFamily: '"Noto Sans", sans-serif' }}
    >
      <nav className="w-full px-8 md:px-12 py-8 flex items-center justify-between z-50 fixed top-0 left-0 bg-gradient-to-b from-white/40 to-transparent backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-full border border-zen-text-main/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-zen-indigo rounded-full"></div>
          </div>
          <span 
            className="text-2xl tracking-wide text-zen-text-main font-light"
            style={{ fontFamily: '"Noto Sans", sans-serif' }}
          >
            Unveil
          </span>
        </Link>

        <div className="flex items-center gap-10">
          <div className="hidden md:flex gap-8">
            <a
              href="#methodology"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Methodology
            </a>
            <a
              href="#protocols"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Protocols
            </a>
            <a
              href="#findings"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Findings
            </a>
          </div>
          <Link
            to="/dashboard"
            className="relative px-6 py-2.5 overflow-hidden rounded-full border border-zen-text-main/10 transition-all hover:border-zen-indigo/30 bg-white/20 backdrop-blur-md group"
          >
            <span 
              className="relative z-10 text-xs font-semibold tracking-widest uppercase text-zen-text-main group-hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Enter App
            </span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-grow flex flex-col w-full max-w-[1400px] mx-auto pt-32 px-6 md:px-12">
        <section className="min-h-[90vh] flex items-center justify-center relative">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="relative z-20 animate-fade-in select-none order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 bg-zen-indigo rounded-full"></div>
                <span 
                  className="text-zen-indigo text-[10px] font-semibold tracking-[0.25em] uppercase"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Solana Privacy Benchmark
                </span>
              </div>
              
              <h1 
                className="font-light text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-zen-text-main tracking-tight leading-[1.1] mb-8"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                <span className="text-zen-indigo/70">Solana</span> <span className="font-extralight">Timing</span>
                <br />
                <span className="font-extralight">
                  Correlation Benchmark
                </span>
              </h1>
              
              <p 
                className="text-zen-text-sub max-w-md leading-relaxed text-base mb-10 opacity-80"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Privacy protocols hide who sends what to whom — but they can't hide when. 
                UNVEIL matches timestamps to measure how effectively each protocol breaks the link.
              </p>

              <div className="flex items-center gap-6">
                <Link
                  to="/dashboard"
                  className="group relative px-8 py-4 overflow-hidden rounded-full border-2 border-zen-text-main 
                           bg-transparent transition-all duration-300 hover:bg-zen-text-main inline-flex items-center gap-3"
                >
                  <span 
                    className="relative z-10 text-sm font-medium tracking-wide text-zen-text-main group-hover:text-white transition-colors"
                    style={{ fontFamily: '"Noto Sans", sans-serif' }}
                  >
                    View Dashboard
                  </span>
                  <span className="material-symbols-outlined text-lg text-zen-text-main group-hover:text-white group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </Link>
                
                <a
                  href="#methodology"
                  className="group flex items-center gap-2 text-zen-text-sub hover:text-zen-text-main transition-colors"
                >
                  <span 
                    className="text-sm font-medium"
                    style={{ fontFamily: '"Noto Sans", sans-serif' }}
                  >
                    Learn more
                  </span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-y-0.5 transition-all">
                    arrow_downward
                  </span>
                </a>
              </div>

              <div className="flex items-center gap-8 mt-16 pt-8 border-t border-zen-text-main/10">
                <div>
                  <div className="text-3xl font-light text-zen-text-main" style={{ fontFamily: '"Noto Sans", sans-serif' }}>3</div>
                  <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Protocols Analyzed</div>
                </div>
                <div className="w-px h-10 bg-zen-text-main/10"></div>
                <div>
                  <div className="text-3xl font-light text-zen-text-main" style={{ fontFamily: '"Noto Sans", sans-serif' }}>100%</div>
                  <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Mainnet Data</div>
                </div>
                <div className="w-px h-10 bg-zen-text-main/10"></div>
                <div>
                  <div className="text-3xl font-light text-zen-text-main" style={{ fontFamily: '"Noto Sans", sans-serif' }}>Real-time</div>
                  <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Analysis</div>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center select-none order-1 lg:order-2">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <div className="w-[450px] h-[450px] md:w-[580px] md:h-[580px] lg:w-[720px] lg:h-[720px] rounded-full orbital-line animate-spin-slow"></div>
                <div className="w-[360px] h-[360px] md:w-[470px] md:h-[470px] lg:w-[580px] lg:h-[580px] rounded-full orbital-line animate-spin-reverse-slow border-dashed"></div>
              </div>

              <div className="w-[360px] h-[360px] md:w-[480px] md:h-[480px] lg:w-[580px] lg:h-[580px] relative z-10">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-zen-indigo/10 animate-pulse"></div>
                  </div>
                }>
                  <ParticleSphereScene />
                </Suspense>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
            <span className="h-12 w-[1px] bg-zen-text-main"></span>
            <span 
              className="text-[9px] font-medium tracking-[0.3em] uppercase"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Scroll
            </span>
          </div>
        </section>

        {/* Methodology Section - Bento Grid */}
        <section
          id="methodology"
          className="relative z-20 pb-32 mt-24 lg:mt-32"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {/* Large card - How It Works (left) */}
            <article className="glass-card p-8 lg:p-10 flex flex-col group animate-fade-in md:row-span-2">
              <div className="flex-grow flex flex-col justify-center">
                <div className="icon-container mb-8">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <h3 
                  className="text-4xl lg:text-5xl text-zen-text-main mb-6 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  How It Works
                </h3>
                <p 
                  className="text-sm text-zen-text-sub leading-relaxed mb-4"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  When a user deposits into a privacy pool and later withdraws, both events 
                  are publicly visible on-chain. If a withdrawal happens shortly after a deposit 
                  of a similar amount, they're likely the same user.
                </p>
                <p 
                  className="text-sm text-zen-text-sub leading-relaxed"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  UNVEIL scans every deposit-withdrawal pair across each protocol, scores them 
                  by time proximity and amount similarity, and calculates how many transactions 
                  can be linked back to their origin.
                </p>
              </div>
              <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity mt-auto">
                <span 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Timing Correlation
                </span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </article>

            {/* Top right card - Linkability Rate */}
            <article className="glass-card p-6 lg:p-8 flex flex-col group animate-fade-in stagger-1">
              <div className="flex-grow">
                <div className="icon-container mb-4 w-10 h-10">
                  <span className="material-symbols-outlined text-lg">percent</span>
                </div>
                <h3 
                  className="text-2xl text-zen-text-main mb-3 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Linkability Rate
                </h3>
                <p 
                  className="text-sm text-zen-text-sub leading-relaxed"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  The percentage of transactions where a deposit can be matched to its 
                  withdrawal with high confidence. Higher means less private.
                </p>
              </div>
              <div className="pt-4 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity mt-auto">
                <span 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Key Metric
                </span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </article>

            {/* Bottom right card - Anonymity Set */}
            <article className="glass-card p-6 lg:p-8 flex flex-col group animate-fade-in stagger-2">
              <div className="flex-grow">
                <div className="icon-container mb-4 w-10 h-10">
                  <span className="material-symbols-outlined text-lg">groups</span>
                </div>
                <h3 
                  className="text-2xl text-zen-text-main mb-3 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Anonymity Set
                </h3>
                <p 
                  className="text-sm text-zen-text-sub leading-relaxed"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  The number of possible senders a withdrawal could have come from. 
                  Larger is better — a set of 1 means the sender is fully exposed.
                </p>
              </div>
              <div className="pt-4 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity mt-auto">
                <span 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Privacy Measure
                </span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* Protocols Section */}
        <section id="protocols" className="py-24 border-t border-zen-text-main/5">
          <div className="mb-16 animate-fade-in">
            <h3 
              className="text-5xl md:text-6xl lg:text-7xl text-zen-text-main leading-[0.95] tracking-tight mb-6"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Tested<br/>
              <span className="text-zen-indigo/70 font-light">Protocols</span>
            </h3>
            <p 
              className="text-base text-zen-text-sub leading-relaxed opacity-80 max-w-lg"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Real mainnet transaction data from Privacy Cash, SilentSwap, and ShadowWire. 
              All data indexed from Solana mainnet via Helius RPC through January 2026.
            </p>
          </div>

          <div className="space-y-4">
            <Link to="/dashboard/privacy-cash" className="group cursor-pointer block">
              <div className="flex items-center justify-between py-6 border-b border-zen-text-main/10 hover:border-zen-indigo/30 transition-colors">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-full bg-zen-text-main/5 flex items-center justify-center group-hover:bg-zen-indigo/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">lock_open</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 
                        className="text-xl font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors"
                        style={{ fontFamily: '"Noto Sans", sans-serif' }}
                      >
                        Privacy Cash
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-zen-text-main/10 text-zen-text-sub text-[9px] font-bold uppercase tracking-wider">
                        ZK Merkle Pool
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub max-w-md">
                      Users deposit SOL into a shielded pool backed by a Merkle tree. Small anonymity set and predictable deposit amounts make timing correlation straightforward.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">68%<span className="text-sm text-zen-text-sub ml-1">linkable</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Linkability Rate</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </Link>

            <Link to="/dashboard/shadowwire" className="group cursor-pointer block">
              <div className="flex items-center justify-between py-6 border-b border-zen-text-main/10 hover:border-zen-indigo/30 transition-colors">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-full bg-zen-text-main/5 flex items-center justify-center group-hover:bg-zen-indigo/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">psychology</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 
                        className="text-xl font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors"
                        style={{ fontFamily: '"Noto Sans", sans-serif' }}
                      >
                        ShadowWire
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-zen-text-main/10 text-zen-text-sub text-[9px] font-bold uppercase tracking-wider">
                        Bulletproofs
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub max-w-md">
                      Uses Bulletproof range proofs to hide transfer amounts on-chain. While amounts are concealed, transaction timing and participant addresses remain visible.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">91%<span className="text-sm text-zen-text-sub ml-1">linkable</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Linkability Rate</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </Link>

            <Link to="/dashboard/silentswap" className="group cursor-pointer block">
              <div className="flex items-center justify-between py-6 border-b border-zen-text-main/10 hover:border-zen-indigo/30 transition-colors">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-full bg-zen-text-main/5 flex items-center justify-center group-hover:bg-zen-indigo/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">swap_horiz</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 
                        className="text-xl font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors"
                        style={{ fontFamily: '"Noto Sans", sans-serif' }}
                      >
                        SilentSwap
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-zen-text-main/10 text-zen-text-sub text-[9px] font-bold uppercase tracking-wider">
                        Cross-chain TEE
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub max-w-md">
                      Routes transactions through shielded paths across multiple blockchains using a TEE-based relay. Cross-chain hops introduce natural timing noise.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">18%<span className="text-sm text-zen-text-sub ml-1">linkable</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Linkability Rate</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-6 mt-12 group/btn cursor-pointer w-fit">
            <Link
              to="/dashboard"
              className="flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-full border border-zen-text-main/10 flex items-center justify-center group-hover/btn:border-zen-indigo/30 transition-all bg-white/50">
                <span className="material-symbols-outlined text-zen-text-main group-hover/btn:text-zen-indigo transition-colors text-lg">arrow_forward</span>
              </div>
              <span 
                className="text-xs uppercase tracking-widest text-zen-text-main group-hover/btn:text-zen-indigo transition-colors"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                View Full Analysis
              </span>
            </Link>
          </div>
        </section>

        {/* Findings Section */}
        <section id="findings" className="py-24 border-t border-zen-text-main/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h3 
                className="text-4xl md:text-5xl text-zen-text-main leading-[1] tracking-tight mb-8"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Key<br/>
                <span className="text-zen-indigo/70 font-light">Findings</span>
              </h3>
              <p 
                className="text-base text-zen-text-sub leading-relaxed mb-5"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Privacy Cash: ~68% linkability — two-thirds of deposits matched via timing heuristics.
              </p>
              <p 
                className="text-base text-zen-text-sub leading-relaxed mb-5"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                SilentSwap: ~18% linkability — cross-chain routing adds timing noise.
              </p>
              <p 
                className="text-base text-zen-text-sub leading-relaxed"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                ShadowWire: Hides amounts but not timing, leaving it vulnerable.
              </p>
            </div>
            <div className="glass-card p-8 lg:p-10">
              <h4 
                className="text-xl font-medium text-zen-text-main mb-6"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Why This Matters
              </h4>
              <p 
                className="text-sm text-zen-text-sub leading-relaxed mb-5"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                ZK proofs guarantee unlinkability within the proof system — but metadata leaks outside it.
              </p>
              <p 
                className="text-sm text-zen-text-sub leading-relaxed mb-5"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Timestamps and amounts are publicly visible. Predictable user behavior breaks privacy.
              </p>
              <p 
                className="text-sm text-zen-text-main leading-relaxed font-medium"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Not a cryptography flaw — a human behavior flaw.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-zen-text-main/5 py-12 flex flex-col md:flex-row justify-between items-center text-zen-text-sub/50">
          <div>
            <p 
              className="text-lg text-zen-text-main/80 font-light mb-2"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Unveil
            </p>
            <p 
              className="text-xs text-zen-text-sub max-w-sm"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Built for Privacy Hack 2026. Open-source security research — not financial advice. 
              The goal is to improve privacy for everyone on Solana.
            </p>
          </div>
          <div 
            className="flex gap-8 mt-4 md:mt-0 text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: '"Noto Sans", sans-serif' }}
          >
            <a
              href="#"
              className="hover:text-zen-text-main transition-colors"
            >
              Terms
            </a>
            <a
              href="#"
              className="hover:text-zen-text-main transition-colors"
            >
              Privacy
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zen-text-main transition-colors"
            >
              GitHub
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default LandingPage;
