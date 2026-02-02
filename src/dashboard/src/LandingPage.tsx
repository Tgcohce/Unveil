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
        <section className="min-h-[85vh] flex flex-col items-center justify-center relative pb-20">
          <div className="text-center relative z-20 mb-8 animate-fade-in select-none">
            <h2 
              className="text-zen-indigo text-xs font-semibold tracking-[0.3em] uppercase mb-6 opacity-90"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Solana Privacy Benchmark
            </h2>
            <h1 
              className="font-light text-6xl md:text-8xl lg:text-9xl text-zen-text-main tracking-tighter leading-[0.9] mb-8"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Architectural
              <br />
              <span className="text-zen-text-sub/70 font-thin">
                Silence
              </span>
            </h1>
            <p 
              className="text-zen-text-sub max-w-md mx-auto leading-7 text-sm opacity-70 tracking-wide"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              We quantify the invisible. A living audit of on-chain anonymity
              designed for the profound observer.
            </p>
          </div>

          <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center select-none my-[-20px] z-30">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full orbital-line animate-spin-slow"></div>
              <div className="w-[320px] h-[320px] md:w-[480px] md:h-[480px] rounded-full orbital-line animate-spin-reverse-slow border-dashed"></div>
            </div>

            <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] relative z-10">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-zen-indigo/10 animate-pulse"></div>
                </div>
              }>
                <ParticleSphereScene />
              </Suspense>
            </div>
          </div>

          <div className="mt-8 z-20">
            <Link
              to="/dashboard"
              className="group relative px-10 py-4 overflow-hidden rounded-full border border-zen-text-main/10 
                       transition-all duration-500 hover:border-zen-indigo/30 bg-white/30 backdrop-blur-md inline-flex items-center gap-3"
            >
              <span 
                className="relative z-10 text-sm font-medium tracking-wide text-zen-text-main group-hover:text-zen-indigo transition-colors"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
              >
                View Live Dashboard
              </span>
              <span className="material-symbols-outlined text-lg text-zen-text-main group-hover:text-zen-indigo group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
              <div className="absolute inset-0 bg-zen-indigo/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            </Link>
          </div>

          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 opacity-30">
            <span className="h-16 w-[1px] bg-zen-text-main"></span>
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12 relative z-20 pb-32"
        >
          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[360px] group animate-fade-in stagger-1">
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

          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[360px] group mt-0 md:mt-12 animate-fade-in stagger-2">
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

          <article className="glass-card p-8 lg:p-10 flex flex-col min-h-[360px] group mt-0 md:mt-24 animate-fade-in stagger-3">
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

        <section id="protocols" className="pb-32">
          <div className="text-center mb-16 animate-fade-in">
            <h2 
              className="text-zen-indigo text-xs font-semibold tracking-[0.3em] uppercase mb-4 opacity-90"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Real-World Privacy Analysis
            </h2>
            <h3 
              className="text-4xl md:text-5xl text-zen-text-main tracking-tight font-light"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              Tested <span className="font-extralight">Protocols</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 relative group overflow-hidden animate-fade-in stagger-1">
              <div className="absolute -right-20 -top-20 w-60 h-60 bg-red-500/5 rounded-full blur-[60px] group-hover:bg-red-500/10 transition-colors"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="icon-container">
                    <span className="material-symbols-outlined text-red-400">
                      lock_open
                    </span>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ fontFamily: '"Noto Sans", sans-serif' }}
                  >
                    Vulnerable
                  </span>
                </div>
                <h3 
                  className="text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors font-medium"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Privacy Cash
                </h3>
                <p 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-sub mb-6"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Mixing Protocol
                </p>
                <div className="space-y-4">
                  <div>
                    <div 
                      className="flex justify-between text-xs text-zen-text-sub uppercase tracking-wider mb-2"
                      style={{ fontFamily: '"Noto Sans", sans-serif' }}
                    >
                      <span>Privacy Score</span>
                      <span className="text-red-500 font-bold">16/100</span>
                    </div>
                    <div className="h-1 w-full bg-zen-text-main/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-[16%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 relative group overflow-hidden animate-fade-in stagger-2">
              <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="icon-container">
                    <span className="material-symbols-outlined text-blue-400">
                      shield
                    </span>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ fontFamily: '"Noto Sans", sans-serif' }}
                  >
                    No Usage
                  </span>
                </div>
                <h3 
                  className="text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors font-medium"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Confidential Transfers
                </h3>
                <p 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-sub mb-6"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Token-2022 Feature
                </p>
                <div className="space-y-4">
                  <div>
                    <div 
                      className="flex justify-between text-xs text-zen-text-sub uppercase tracking-wider mb-2"
                      style={{ fontFamily: '"Noto Sans", sans-serif' }}
                    >
                      <span>Adoption</span>
                      <span className="text-zen-text-main font-bold">0%</span>
                    </div>
                    <div className="h-1 w-full bg-zen-text-main/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[0%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 relative group overflow-hidden animate-fade-in stagger-3">
              <div className="absolute right-0 bottom-0 w-40 h-40 bg-purple-500/5 rounded-full blur-[60px] group-hover:bg-purple-500/10 transition-colors"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="icon-container">
                    <span className="material-symbols-outlined text-purple-400">
                      psychology
                    </span>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ fontFamily: '"Noto Sans", sans-serif' }}
                  >
                    Defeated
                  </span>
                </div>
                <h3 
                  className="text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors font-medium"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  ShadowWire
                </h3>
                <p 
                  className="text-[10px] font-medium uppercase tracking-widest text-zen-text-sub mb-6"
                  style={{ fontFamily: '"Noto Sans", sans-serif' }}
                >
                  Bulletproof ZK
                </p>
                <div className="space-y-4">
                  <div>
                    <div 
                      className="flex justify-between text-xs text-zen-text-sub uppercase tracking-wider mb-2"
                      style={{ fontFamily: '"Noto Sans", sans-serif' }}
                    >
                      <span>Privacy Score</span>
                      <span className="text-red-500 font-bold">0/100</span>
                    </div>
                    <div className="h-1 w-full bg-zen-text-main/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[0%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-16">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-zen-text-sub hover:text-zen-indigo transition-colors flex items-center gap-2 group"
              style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
              View Full Analysis
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                arrow_right_alt
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
