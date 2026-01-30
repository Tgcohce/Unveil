import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let animationId: number;
    let velocityX = 0;
    let velocityY = 0;
    const friction = 0.92;
    const spring = 0.05;

    const animate = () => {
      if (!isDragging) {
        const dx = 0 - orbPosition.x;
        const dy = 0 - orbPosition.y;
        velocityX += dx * spring;
        velocityY += dy * spring;
        velocityX *= friction;
        velocityY *= friction;

        if (Math.abs(orbPosition.x) > 0.5 || Math.abs(orbPosition.y) > 0.5) {
          setOrbPosition((prev) => ({
            x: prev.x + velocityX,
            y: prev.y + velocityY,
          }));
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isDragging, orbPosition, mounted]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !orbRef.current) return;
    const rect = orbRef.current.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setOrbPosition({
      x: (e.clientX - centerX) * 0.5,
      y: (e.clientY - centerY) * 0.5,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-serif italic text-2xl text-zen-text-sub">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden relative selection:bg-zen-indigo/20"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <nav className="w-full px-8 md:px-12 py-8 flex items-center justify-between z-50 fixed top-0 left-0 bg-gradient-to-b from-white/40 to-transparent backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-full border border-zen-text-main/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-zen-indigo rounded-full"></div>
          </div>
          <span className="font-serif italic text-2xl tracking-wide text-zen-text-main">
            Unveil
          </span>
        </Link>

        <div className="flex items-center gap-10">
          <div className="hidden md:flex gap-8">
            <a
              href="#features"
              className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
            >
              Features
            </a>
            <a
              href="#protocols"
              className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-zen-text-sub hover:text-zen-indigo transition-colors"
            >
              Protocols
            </a>
          </div>
          <Link
            to="/dashboard"
            className="btn-zen group"
          >
            <span>Enter App</span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-grow flex flex-col w-full max-w-[1400px] mx-auto pt-32 px-6 md:px-12">
        <section className="min-h-[85vh] flex flex-col items-center justify-center relative pb-20">
          <div className="text-center relative z-20 mb-8 animate-fade-in select-none">
            <h2 className="section-subtitle reactive-text">
              Solana Privacy Benchmark
            </h2>
            <h1 className="font-serif font-light text-6xl md:text-8xl lg:text-9xl text-zen-text-main tracking-tighter leading-[0.9] mb-8 reactive-text">
              Architectural
              <br />
              <span className="italic text-zen-text-sub/70 font-thin">
                Silence
              </span>
            </h1>
            <p className="font-sans text-zen-text-sub max-w-md mx-auto leading-7 text-sm opacity-70 tracking-wide reactive-text">
              We quantify the invisible. A living audit of on-chain anonymity
              designed for the profound observer.
            </p>
          </div>

          <div className="relative w-full h-[400px] flex items-center justify-center select-none my-[-40px] z-30">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full orbital-line opacity-30 animate-spin-slow"></div>
              <div className="w-[320px] h-[320px] md:w-[480px] md:h-[480px] rounded-full orbital-line opacity-20 animate-spin-reverse-slow border-dashed"></div>
            </div>

            <div
              ref={orbRef}
              className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full glass-sphere shadow-sphere-glow 
                ${isDragging ? "" : "animate-float"} 
                flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow duration-300`}
              style={{
                transform: `translate(${orbPosition.x}px, ${orbPosition.y}px)`,
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zen-indigo/10 to-transparent opacity-60 pointer-events-none"></div>
              <div className="w-full h-full rounded-full bg-zen-indigo/5 animate-pulse-slow blur-2xl absolute pointer-events-none"></div>
              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] relative z-20 pointer-events-none"></div>
            </div>
          </div>

          <div className="mt-8 z-20">
            <Link
              to="/dashboard"
              className="group relative px-10 py-4 overflow-hidden rounded-full border border-zen-text-main/10 
                       transition-all duration-500 hover:border-zen-indigo/30 bg-white/30 backdrop-blur-md inline-flex items-center gap-3"
            >
              <span className="relative z-10 font-sans text-sm font-semibold tracking-wide text-zen-text-main group-hover:text-zen-indigo transition-colors">
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
            <span className="font-sans text-[9px] tracking-[0.3em] uppercase">
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
              <h3 className="font-serif text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500">
                Profound Insights
              </h3>
              <p className="font-sans text-sm text-zen-text-sub leading-loose opacity-80">
                The Living Audit. Continuous privacy health monitoring
                interpreted through architectural clarity. We transform raw data
                into a narrative of digital hygiene.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="font-sans text-[10px] uppercase tracking-widest text-zen-text-main">
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
              <h3 className="font-serif text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500">
                Visual Topology
              </h3>
              <p className="font-sans text-sm text-zen-text-sub leading-loose opacity-80">
                Particle Cloud technology visualizes transaction pools as
                organic matter. Witness probabilistic linkages form and dissolve
                in the ether of the blockchain.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="font-sans text-[10px] uppercase tracking-widest text-zen-text-main">
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
              <h3 className="font-serif text-3xl text-zen-text-main mb-4 group-hover:text-zen-indigo transition-colors duration-500">
                Real-time Resonance
              </h3>
              <p className="font-sans text-sm text-zen-text-sub leading-loose opacity-80">
                Direct on-chain telemetry offering instant feedback loops.
                Detect exposure vectors and correlation events the moment they
                ripple through the Solana mainnet.
              </p>
            </div>
            <div className="pt-6 border-t border-zen-text-main/5 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="font-sans text-[10px] uppercase tracking-widest text-zen-text-main">
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
            <h2 className="section-subtitle">Real-World Privacy Analysis</h2>
            <h3 className="section-header">
              Tested <span className="italic font-light">Protocols</span>
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
                  <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                    Vulnerable
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors">
                  Privacy Cash
                </h3>
                <p className="text-[10px] font-sans uppercase tracking-widest text-zen-text-sub mb-6">
                  Mixing Protocol
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-sans text-zen-text-sub uppercase tracking-wider mb-2">
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
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                    No Usage
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors">
                  Confidential Transfers
                </h3>
                <p className="text-[10px] font-sans uppercase tracking-widest text-zen-text-sub mb-6">
                  Token-2022 Feature
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-sans text-zen-text-sub uppercase tracking-wider mb-2">
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
                  <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                    Defeated
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-zen-text-main mb-2 group-hover:text-zen-indigo transition-colors">
                  ShadowWire
                </h3>
                <p className="text-[10px] font-sans uppercase tracking-widest text-zen-text-sub mb-6">
                  Bulletproof ZK
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-sans text-zen-text-sub uppercase tracking-wider mb-2">
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
              className="font-sans text-sm text-zen-text-sub hover:text-zen-indigo transition-colors flex items-center gap-2 group"
            >
              View Full Analysis
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                arrow_right_alt
              </span>
            </Link>
          </div>
        </section>

        <footer className="border-t border-zen-text-main/5 py-12 flex flex-col md:flex-row justify-between items-center text-zen-text-sub/50">
          <p className="font-serif italic text-lg text-zen-text-main/80">
            Unveil
          </p>
          <div className="flex gap-8 mt-4 md:mt-0 font-sans text-[10px] uppercase tracking-widest">
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
