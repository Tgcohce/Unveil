import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("LandingPage mounted");
  }, []);

  // If not mounted yet, show a simple loading state
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "white",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div>Loading UNVEIL...</div>
      </div>
    );
  }

  return (
    <div className="bg-dark-gradient text-slate-200 min-h-screen flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary/20 relative">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-lighten filter blur-[80px] opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full mix-blend-lighten filter blur-[80px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-indigo-500/10 rounded-full mix-blend-lighten filter blur-[100px] opacity-25 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="flex items-center gap-6 md:gap-12 bg-slate-800/80 backdrop-blur-md border border-slate-700 px-8 py-3 rounded-full shadow-lg">
          <Link
            to="/"
            className="group flex flex-col items-center gap-1 text-slate-200 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] font-light">
              change_history
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 absolute -bottom-5 transition-opacity">
              Home
            </span>
          </Link>
          <Link
            to="/dashboard"
            className="group flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] font-light">
              grid_view
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 absolute -bottom-5 transition-opacity">
              Dashboard
            </span>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] font-light">
              circle
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 absolute -bottom-5 transition-opacity">
              GitHub
            </span>
          </a>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 px-6 z-10">
        <div className="z-10 text-center flex flex-col items-center gap-6 mb-12 animate-[fadeIn_1s_ease-out]">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white max-w-4xl leading-[1.1]">
            Solana Privacy <br />
            <span className="font-normal italic text-primary">Benchmark</span>
          </h1>
          <p className="text-slate-400 font-display text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
            Measuring privacy guarantees through on-chain analysis.
          </p>
        </div>

        {/* Monolith Image Placeholder */}
        <div className="relative w-full max-w-[300px] md:max-w-[400px] aspect-square flex items-center justify-center mb-16 group cursor-pointer">
          <div className="relative w-full h-full flex items-center justify-center animate-float">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/15 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="w-48 h-64 md:w-64 md:h-80 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
              <span className="material-symbols-outlined text-8xl text-primary opacity-50">
                lock
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overlay */}
        <div className="w-full max-w-7xl mx-auto md:absolute md:inset-0 md:pointer-events-none px-6 md:px-12 py-12 flex flex-col md:justify-between h-full z-0 gap-8">
          <div className="flex flex-col md:flex-row justify-between w-full items-start">
            <div className="flex flex-col gap-1 md:pointer-events-auto group glass-card p-4 rounded-xl">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
                Network Status
              </span>
              <span className="text-2xl font-mono font-medium text-white group-hover:text-primary transition-colors">
                Mainnet-Beta
              </span>
              <span className="text-sm font-mono text-slate-400">
                Solana Network
              </span>
            </div>
            <div className="flex flex-col gap-1 md:text-right md:pointer-events-auto group glass-card p-4 rounded-xl mt-4 md:mt-0">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-1">
                Protocols Tested
              </span>
              <span className="text-2xl font-mono font-medium text-white group-hover:text-primary transition-colors">
                3
              </span>
              <span className="text-sm font-mono text-slate-400">
                Active Benchmarks
              </span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between w-full items-end mt-auto">
            <div className="flex flex-col gap-1 md:pointer-events-auto group w-full md:w-auto glass-card p-4 rounded-xl">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-1">
                Privacy Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-mono font-bold text-red-400">
                  16
                </span>
                <span className="text-lg font-mono text-slate-400">/ 100</span>
              </div>
              <span className="text-sm font-display italic text-slate-400 mt-1">
                "Room for improvement"
              </span>
            </div>
            <div className="flex flex-col gap-1 md:text-right mt-8 md:mt-0 md:pointer-events-auto group w-full md:w-auto glass-card p-4 rounded-xl">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-1">
                Analysis Methods
              </span>
              <span className="text-2xl font-mono font-medium text-white group-hover:text-primary transition-colors">
                Timing Analysis
              </span>
              <span className="text-sm font-mono text-slate-400">
                Amount Patterns
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12 z-20">
          <Link
            to="/dashboard"
            className="relative overflow-hidden group bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-primary/70 text-white px-10 py-4 rounded-full transition-all duration-500 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.5)] inline-block"
          >
            <div className="absolute inset-0 w-0 bg-primary/10 transition-all duration-[400ms] ease-out group-hover:w-full"></div>
            <span className="relative font-display font-medium text-sm tracking-wide group-hover:text-primary flex items-center gap-3">
              View Live Dashboard{" "}
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Protocol Cards Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Tested Protocols
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
              Real-World Privacy Analysis
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Privacy Cash */}
            <div className="glass-card relative group p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:bg-slate-800/60 hover:-translate-y-2">
              <div className="absolute -right-20 -top-20 w-60 h-60 bg-red-500/10 rounded-full blur-[60px] group-hover:bg-red-500/20 transition-colors"></div>
              <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                <span className="material-symbols-outlined text-8xl text-red-400 opacity-50 animate-float">
                  lock_open
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-display text-white group-hover:text-red-400 transition-colors">
                    Privacy Cash
                  </h3>
                  <span className="material-symbols-outlined text-red-400">
                    warning
                  </span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-8 border-b border-slate-700 pb-4">
                  Mixing Protocol
                </p>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
                      <span>Privacy Score</span>
                      <span className="text-red-400 font-bold">16/100</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-[16%]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Status
                    </span>
                    <span className="text-sm font-display italic text-red-400">
                      Broken
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidential Transfers */}
            <div className="glass-card relative group p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:bg-slate-800/60 hover:-translate-y-2 delay-100">
              <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[60px] group-hover:bg-blue-500/20 transition-colors"></div>
              <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                <span
                  className="material-symbols-outlined text-8xl text-blue-400 opacity-50 animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  shield
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-display text-white group-hover:text-blue-400 transition-colors">
                    Confidential Transfers
                  </h3>
                  <span className="material-symbols-outlined text-blue-400">
                    encrypted
                  </span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-8 border-b border-slate-700 pb-4">
                  Token-2022 Feature
                </p>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
                      <span>Adoption</span>
                      <span className="text-white font-bold">0%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[0%]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Status
                    </span>
                    <span className="text-sm font-display italic text-slate-300">
                      No Usage
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ShadowWire */}
            <div className="glass-card relative group p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:bg-slate-800/60 hover:-translate-y-2 delay-200">
              <div className="absolute right-0 bottom-0 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px] group-hover:bg-purple-500/20 transition-colors"></div>
              <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                <span
                  className="material-symbols-outlined text-8xl text-purple-400 opacity-50 animate-float"
                  style={{ animationDelay: "2s" }}
                >
                  target
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-display text-white group-hover:text-purple-400 transition-colors">
                    ShadowWire
                  </h3>
                  <span className="material-symbols-outlined text-purple-400">
                    psychology
                  </span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-8 border-b border-slate-700 pb-4">
                  Bulletproof ZK
                </p>
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
                      <span>Privacy Score</span>
                      <span className="text-red-400 font-bold">0/100</span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[0%]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Status
                    </span>
                    <span className="text-sm font-display italic text-red-400">
                      Defeated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-16 opacity-70 hover:opacity-100 transition-opacity">
            <Link
              to="/dashboard"
              className="font-display text-sm text-slate-400 hover:text-primary transition-colors flex items-center gap-2 group"
            >
              View Full Analysis
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_right_alt
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-slate-800 bg-slate-900/30 backdrop-blur-sm z-10">
        <p className="font-display text-xs text-slate-500 uppercase tracking-widest">
          UNVEIL © 2025 •{" "}
          <span className="font-mono lowercase text-[10px]">
            Educational Research Tool
          </span>
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
