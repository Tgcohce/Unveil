import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { ConnectionStatus } from "./ConnectionStatus";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const location = useLocation();
  
  const navItems = [
    {
      path: "/dashboard",
      icon: "dashboard",
      label: "Overview",
      score: null,
    },
    {
      path: "/dashboard/privacy-cash",
      icon: "lock_open",
      label: "Privacy Cash",
      score: 5,
    },
    {
      path: "/dashboard/shadowwire",
      icon: "psychology",
      label: "ShadowWire",
      score: 47,
    },
    {
      path: "/dashboard/silentswap",
      icon: "swap_horiz",
      label: "SilentSwap",
      score: 67,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: '"Noto Sans", sans-serif' }}>
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      ></div>

      <aside className="w-16 lg:w-56 h-screen border-r border-zen-text-main/5 flex flex-col bg-transparent backdrop-blur-md z-50 transition-all duration-300 fixed left-0 top-0">
        <div className="p-4 border-b border-zen-text-main/5 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-zen-text-main/20 flex items-center justify-center shrink-0 bg-white/30 backdrop-blur">
              <div className="w-1.5 h-1.5 bg-zen-indigo rounded-full"></div>
            </div>
            <span className="text-xl tracking-wide text-zen-text-main font-light hidden lg:block">
              Unveil
            </span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                isActive(item.path)
                  ? "text-zen-text-main bg-white/50 backdrop-blur border border-zen-indigo/20"
                  : "text-zen-text-sub hover:text-zen-text-main hover:bg-white/30"
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${
                isActive(item.path) ? "text-zen-indigo" : ""
              }`}>
                {item.icon}
              </span>
              <span className={`hidden lg:block text-sm ${isActive(item.path) ? "font-medium" : ""}`}>
                {item.label}
              </span>
              {item.score !== null && (
                <span className="hidden lg:block ml-auto text-xs text-zen-text-sub/70">
                  {item.score}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zen-text-main/5 hidden lg:block">
          <ConnectionStatus />
        </div>
      </aside>

      <main className="flex-1 ml-16 lg:ml-56 h-screen overflow-y-auto relative z-10">
        <header className="sticky top-0 z-40 px-6 py-3 flex justify-between items-center bg-transparent backdrop-blur-md border-b border-zen-text-main/5">
          <div>
            <div className="flex items-center gap-2 text-zen-text-sub text-[11px] mb-0.5">
              <Link to="/dashboard" className="hover:text-zen-text-main transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-zen-text-main">{title}</span>
            </div>
            <h1 className="text-xl lg:text-2xl text-zen-text-main font-light">
              {title}
              {subtitle && <span className="text-zen-text-sub/60 font-extralight ml-2">{subtitle}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 rounded-lg border border-zen-text-main/10 flex items-center justify-center hover:bg-zen-text-main/5 transition-colors"
            >
              <span className="material-symbols-outlined text-base text-zen-text-sub">home</span>
            </Link>
          </div>
        </header>

        <div className="p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
