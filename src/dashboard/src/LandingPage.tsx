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
              href="#features"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Features
            </a>
            <a
              href="#protocols"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Protocols
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
                className="font-light text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-zen-text-main tracking-tight leading-[1] mb-8"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Architectural
                <br />
                <span className="text-zen-indigo/70 font-extralight">
                  Silence
                </span>
              </h1>
              
              <p 
                className="text-zen-text-sub max-w-md leading-relaxed text-base mb-10 opacity-80"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                We quantify the invisible. A living audit of on-chain anonymity
                designed for the profound observer.
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
                  href="#features"
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
                  <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">On-chain Data</div>
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

        <section
          id="features"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative z-20 pb-32 mt-24 lg:mt-32"
        >
          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[400px] group animate-fade-in stagger-1">
            <div className="flex-grow">
              <div className="icon-container mb-8">
                <span className="material-symbols-outlined">query_stats</span>
              </div>
              <h3 
                className="text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Profound Insights
              </h3>
              <p 
                className="text-sm text-zen-text-sub leading-relaxed"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                The Living Audit. Continuous privacy health monitoring
                interpreted through architectural clarity. We transform raw data
                into a narrative of digital hygiene.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span 
                className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Explore Audit
              </span>
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </div>
          </article>

          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[400px] group animate-fade-in stagger-2">
            <div className="flex-grow">
              <div className="icon-container mb-8">
                <span className="material-symbols-outlined">grain</span>
              </div>
              <h3 
                className="text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Visual Topology
              </h3>
              <p 
                className="text-sm text-zen-text-sub leading-relaxed"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Particle Cloud technology visualizes transaction pools as
                organic matter. Witness probabilistic linkages form and dissolve
                in the ether of the blockchain.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span 
                className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                View Topology
              </span>
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </div>
          </article>

          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[400px] group animate-fade-in stagger-3">
            <div className="flex-grow">
              <div className="icon-container mb-8">
                <span className="material-symbols-outlined">graphic_eq</span>
              </div>
              <h3 
                className="text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500 font-light"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Real-time Resonance
              </h3>
              <p 
                className="text-sm text-zen-text-sub leading-relaxed"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Direct on-chain telemetry offering instant feedback loops.
                Detect exposure vectors and correlation events the moment they
                ripple through the Solana mainnet.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span 
                className="text-[10px] font-medium uppercase tracking-widest text-zen-text-main"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                Live Telemetry
              </span>
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </div>
          </article>
        </section>

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
              Real-world privacy analysis on Solana mainnet. We measure what matters: timing correlation, amount linkability, and anonymity set degradation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="group cursor-pointer">
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
                        Vulnerable
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub">ZK Mixing Protocol · Timing Attack Susceptible</p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">16<span className="text-sm text-zen-text-sub">/100</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Privacy Score</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer">
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
                        Defeated
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub">Bulletproof ZK · Amount Correlation Broken</p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">0<span className="text-sm text-zen-text-sub">/100</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Privacy Score</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer">
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
                        Limited
                      </span>
                    </div>
                    <p className="text-sm text-zen-text-sub">TEE Relay · Graph Analysis Possible</p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right hidden md:block">
                    <div className="text-2xl font-light text-zen-text-main">18<span className="text-sm text-zen-text-sub">/100</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-zen-text-sub">Privacy Score</div>
                  </div>
                  <span className="material-symbols-outlined text-zen-text-sub group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
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

        <footer className="border-t border-zen-text-main/5 py-12 flex flex-col md:flex-row justify-between items-center text-zen-text-sub/50">
          <p 
            className="text-lg text-zen-text-main/80 font-light"
            style={{ fontFamily: '"Noto Sans", sans-serif' }}
          >
            Unveil
          </p>
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
              Documentation
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default LandingPage;
