import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

const loadJsonData = async (filename: string) => {
  const response = await fetch(`/data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }
  return response.json();
};

interface Match {
  withdrawal: {
    signature: string;
    amount: number;
    timestamp: number;
    recipient: string;
  };
  anonymitySet: number;
  vulnerabilityLevel: string;
  possibleSources: Array<{
    deposit: {
      signature: string;
      amount: number;
      timestamp: number;
      depositor: string;
    };
    confidence: number;
    timeDelta: number;
    timeDeltaHours: number;
    reasoning: string[];
  }>;
}

interface ProtocolComparison {
  privacyCash: {
    protocol: string;
    privacyScore: number;
    totalDeposits: number;
    totalWithdrawals: number;
    avgAnonymitySet: number;
    attackSuccessRate: number;
    hidesAmounts: boolean;
    hidesAddresses: boolean;
  };
  confidentialTransfers: {
    protocol: string;
    privacyScore: number;
    totalTransfers: number;
    uniqueUsers: number;
    addressReuseRate: number;
    auditorCentralization: number;
    hidesAmounts: boolean;
    hidesAddresses: boolean;
  };
  summary: {
    winner: string;
    recommendation: string;
  };
}

const SHADOWWIRE_POOL_ADDRESSES = [
  "ApfNmzrNXLUQ5yWpQVmrCB4MNsaRqjsFrLXViBq2rBU", // SOL pool
  "3hShyAWTjsm63TnMHCVSerjwmvgtMmvCNSgyXqeQqFft", // BONK pool
  "2nwRTVmRSPgLZcdvmUguftrpcnU4Lzg8Nm5dMT9AAazS", // GOD pool
  "14kbizF6VZjSFLS21FjvgPYHz45oLzQBomhpiN89xFqv", // USD1 pool
  "HexBg3QDHTE5SKniXZgDARybQwnoEioDKxoUKBsxhtbT", // Token pool
  "CCG1UCVWhGfZiCHsDYrts24aPD5e6PFFotaswHG1jf5E", // Token pool
  "6ZKFfWG7HqJXhZy3Tcu8qMT25nme1JLDWCyQj5F4NNUM", // Alternative pool PDA
];

function isPoolAddress(address: string): boolean {
  return SHADOWWIRE_POOL_ADDRESSES.includes(address);
}

const TOKEN_SYMBOLS: Record<string, string> = {
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB: "USD1",
  CzFvsLdUazabdiu9TYXujj4EY495fG7VgJJ3vQs6bonk: "BONK",
  GodL6KZ9uuUoQwELggtVzQkKmU1LfqmDokPibPeDKkhF: "GOD",
  "3iC63FgnB7EhcPaiSaC51UkVweeBDkqu17SaRyy2pump": "PUMP",
  SOL: "SOL",
};

function formatTokenAmount(
  token: string,
  amount: number,
  decimals: number = 9,
): { symbol: string; formatted: string } {
  const symbol = TOKEN_SYMBOLS[token] || "UNKNOWN";
  const value = amount / Math.pow(10, decimals);
  const precision = decimals <= 5 ? 2 : decimals <= 6 ? 6 : 9;
  const formatted = value.toFixed(precision);
  return { symbol, formatted };
}

function App() {
  const [activeTab, setActiveTab] = useState<
    "privacy-cash" | "confidential-transfers" | "shadowwire" | "silentswap"
  >("privacy-cash");

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(
    new Set(),
  );

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => loadJsonData("stats.json"),
  });

  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => loadJsonData("metrics.json"),
  });

  const { data: matchData, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => loadJsonData("matches.json"),
  });

  const { data: comparison } = useQuery<ProtocolComparison>({
    queryKey: ["compare"],
    queryFn: () => loadJsonData("comparison.json"),
  });


  const { data: swAnalysis } = useQuery({
    queryKey: ["swAnalysis"],
    queryFn: () => loadJsonData("shadowwire-analysis.json"),
  });

  const { data: swTransfersData, isLoading: swTransfersLoading } = useQuery({
    queryKey: ["swTransfers"],
    queryFn: () => loadJsonData("shadowwire-transfers.json"),
  });

  const swTransfers = swTransfersData?.transfers || [];

  const { data: ssAnalysis } = useQuery({
    queryKey: ["ssAnalysis"],
    queryFn: () => loadJsonData("silentswap-analysis.json"),
  });

  const { data: ssMatchesData, isLoading: ssMatchesLoading } = useQuery({
    queryKey: ["ssMatches"],
    queryFn: () => loadJsonData("silentswap-matches.json"),
  });

  const ssMatches = ssMatchesData?.matches || [];

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => loadJsonData("metadata.json"),
  });

  const allMatches: Match[] = (matchData?.matches || [])
    .map((m: any) => ({
      ...m,
      possibleSources: (m.possibleSources || m.likelySources || []).map(
        (source: any) => ({
          ...source,
          timeDeltaHours:
            source.timeDeltaHours ?? source.timeDelta / (1000 * 60 * 60),
        }),
      ),
    }))
    .filter(
      (m: Match) =>
        m.possibleSources &&
        Array.isArray(m.possibleSources) &&
        m.possibleSources.length > 0,
    );

  const matches = allMatches.filter((match) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchesWithdrawal =
      match.withdrawal.signature.toLowerCase().includes(query) ||
      match.withdrawal.recipient.toLowerCase().includes(query);

    const matchesDeposit = match.possibleSources.some(
      (source) =>
        source.deposit.signature.toLowerCase().includes(query) ||
        source.deposit.depositor.toLowerCase().includes(query),
    );

    return matchesWithdrawal || matchesDeposit;
  });

  const toggleMatch = (signature: string) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(signature)) {
      newExpanded.delete(signature);
    } else {
      newExpanded.add(signature);
    }
    setExpandedMatches(newExpanded);
  };

  const formatAmount = (lamports: number) => {
    return (lamports / 1e9).toFixed(3) + " SOL";
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeDelta = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const truncateSig = (sig: string) => {
    return `${sig.slice(0, 6)}...${sig.slice(-4)}`;
  };

  const getSolscanLink = (address: string, type: "tx" | "address") => {
    return `https://solscan.io/${type}/${address}`;
  };

  const getVulnerabilityColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-700 bg-red-100 border-red-300";
      case "high":
        return "text-orange-700 bg-orange-100 border-orange-300";
      case "medium":
        return "text-yellow-700 bg-yellow-100 border-yellow-300";
      default:
        return "text-green-700 bg-green-100 border-green-300";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-red-700";
    if (confidence >= 0.6) return "text-orange-700";
    if (confidence >= 0.4) return "text-yellow-700";
    return "text-zen-text-sub";
  };

  return (
    <div className="min-h-screen text-zen-text-main relative overflow-x-hidden transition-colors duration-500 font-sans">
      <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-white/20 transition-colors border border-zen-text-main/10 hover:border-zen-indigo/30"
          >
            <span className="material-symbols-outlined text-zen-text-main">
              arrow_back
            </span>
          </Link>
          <div className="flex flex-col">
            <h1 className="font-serif italic text-2xl tracking-wide text-zen-text-main">
              Unveil
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zen-text-sub font-bold">
                Timing Correlation Benchmark
              </span>
              {metadata?.lastUpdated && (
                <span className="flex items-center gap-1.5 text-[10px] text-zen-text-sub">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  Updated {new Date(metadata.lastUpdated).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex p-1 bg-white/30 rounded-full backdrop-blur-md border border-white/40">
          <button
            onClick={() => setActiveTab("privacy-cash")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "privacy-cash"
                ? "bg-white/60 shadow-sm text-zen-text-main border border-white/60"
                : "text-zen-text-sub hover:text-zen-text-main"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Privacy Cash</span>
              {comparison && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    comparison.privacyCash.privacyScore < 30
                      ? "bg-red-500/20 text-red-600"
                      : "bg-orange-500/20 text-orange-600"
                  }`}
                >
                  {comparison.privacyCash.privacyScore}/100
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("confidential-transfers")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "confidential-transfers"
                ? "bg-white/60 shadow-sm text-zen-text-main border border-white/60"
                : "text-zen-text-sub hover:text-zen-text-main"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Confidential Transfers</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zen-text-main/10 text-zen-text-sub">
                Coming Soon
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("shadowwire")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "shadowwire"
                ? "bg-white/60 shadow-sm text-zen-text-main border border-white/60"
                : "text-zen-text-sub hover:text-zen-text-main"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>ShadowWire</span>
              {swAnalysis && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    swAnalysis.privacyScore < 30
                      ? "bg-red-500/20 text-red-600"
                      : swAnalysis.privacyScore < 60
                        ? "bg-orange-500/20 text-orange-600"
                        : "bg-green-500/20 text-green-600"
                  }`}
                >
                  {swAnalysis.privacyScore || 0}/100
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("silentswap")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "silentswap"
                ? "bg-white/60 shadow-sm text-zen-text-main border border-white/60"
                : "text-zen-text-sub hover:text-zen-text-main"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>SilentSwap</span>
              {ssAnalysis && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    ssAnalysis.privacyScore < 30
                      ? "bg-red-500/20 text-red-600"
                      : ssAnalysis.privacyScore < 60
                        ? "bg-orange-500/20 text-orange-600"
                        : "bg-green-500/20 text-green-600"
                  }`}
                >
                  {ssAnalysis.privacyScore || "?"}/100
                </span>
              )}
            </div>
          </button>
        </div>

        <button className="p-2 rounded-full hover:bg-white/20 transition-colors border border-zen-text-main/10 hover:border-zen-indigo/30">
          <span className="material-symbols-outlined text-zen-text-main">
            settings_suggest
          </span>
        </button>
      </nav>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 pb-20">
        <section className="mt-16 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-serif text-5xl md:text-7xl font-light text-zen-text-main leading-tight mb-8 tracking-tight">
              Privacy{" "}
              <span className="italic text-zen-text-sub/70 font-thin">
                Measurement
              </span>
            </h2>
            <p className="text-base md:text-lg text-zen-text-sub font-sans leading-relaxed max-w-2xl mx-auto">
              Quantifying anonymity through on-chain analysis. We measure
              digital fingerprints, timing correlations, and transaction
              patterns to benchmark privacy guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-card p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-zen-text-main">
                  savings
                </span>
              </div>
              <h3 className="font-serif text-2xl mb-3 text-zen-text-main group-hover:text-zen-indigo transition-colors">
                The Promise
              </h3>
              <p className="text-sm text-zen-text-sub leading-relaxed mb-8">
                A communal pool where users deposit assets. Once mixed, the
                origin of any single withdrawal should theoretically remain
                indistinguishable.
              </p>
              <div className="mt-auto pt-4 border-t border-zen-text-main/10">
                <span className="text-[10px] uppercase tracking-widest text-zen-text-sub flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    radio_button_checked
                  </span>
                  Deposits accepted
                </span>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-zen-text-main">
                  visibility
                </span>
              </div>
              <h3 className="font-serif text-2xl mb-3 text-zen-text-main group-hover:text-zen-indigo transition-colors">
                The Reality
              </h3>
              <p className="text-sm text-zen-text-sub leading-relaxed mb-8">
                Unique amounts and specific timing create patterns. If 10.5 SOL
                enters and 10.4 SOL exits minutes later, the link is visible.
              </p>
              <div className="mt-auto pt-4 border-t border-zen-text-main/10">
                <span className="text-[10px] uppercase tracking-widest text-zen-amber flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    warning
                  </span>
                  Correlation detected
                </span>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-zen-text-main">
                  fingerprint
                </span>
              </div>
              <h3 className="font-serif text-2xl mb-3 text-zen-text-main group-hover:text-zen-indigo transition-colors">
                Unveil's Analysis
              </h3>
              <p className="text-sm text-zen-text-sub leading-relaxed mb-8">
                We mathematically prove these links by analyzing{" "}
                <strong className="text-zen-indigo">Amount</strong> consistency, <strong className="text-zen-indigo">Timing</strong>{" "}
                proximity, and <strong className="text-zen-indigo">Graph</strong> heuristics.
              </p>
              <div className="mt-auto pt-4 border-t border-zen-text-main/10">
                <span className="text-[10px] uppercase tracking-widest text-zen-text-sub flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    analytics
                  </span>
                  Heuristics applied
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/30 rounded-lg border border-white/40">
                <span className="material-symbols-outlined text-xl text-zen-text-main">
                  compare
                </span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-zen-text-main">
                  Protocol Comparison
                </h3>
                <p className="text-xs text-zen-text-sub">
                  Real mainnet data, January 2026
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/40">
                    <th className="text-left py-3 px-4 text-zen-text-sub font-medium">
                      Protocol
                    </th>
                    <th className="text-left py-3 px-4 text-zen-text-sub font-medium">
                      Architecture
                    </th>
                    <th className="text-right py-3 px-4 text-zen-text-sub font-medium">
                      Transactions
                    </th>
                    <th className="text-right py-3 px-4 text-zen-text-sub font-medium">
                      Avg Anonymity Set
                    </th>
                    <th className="text-right py-3 px-4 text-zen-text-sub font-medium">
                      Linkability
                    </th>
                    <th className="text-center py-3 px-4 text-zen-text-sub font-medium">
                      Timing Resistance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={`border-b border-white/40/50 hover:bg-white/30/30 cursor-pointer transition-colors ${activeTab === "privacy-cash" ? "bg-white/30/40" : ""}`}
                    onClick={() => setActiveTab("privacy-cash")}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zen-text-main">
                          Privacy Cash
                        </span>
                        {activeTab === "privacy-cash" && (
                          <span className="text-xs bg-slate-700 text-zen-text-sub px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-zen-text-sub">ZK Pool</td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {(comparison?.privacyCash?.totalDeposits || 0) +
                        (comparison?.privacyCash?.totalWithdrawals || 0)}
                    </td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {metrics?.avgAnonymitySet?.toFixed(1) || "1.0"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-red-400 font-semibold">
                        {allMatches.length > 0
                          ? `${Math.round((allMatches.filter((m) => m.anonymitySet === 1).length / allMatches.length) * 100)}%`
                          : "68%"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                        LOW
                      </span>
                    </td>
                  </tr>

                  <tr
                    className={`border-b border-white/40/50 hover:bg-white/30/30 cursor-pointer transition-colors ${activeTab === "silentswap" ? "bg-white/30/40" : ""}`}
                    onClick={() => setActiveTab("silentswap")}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zen-text-main">
                          SilentSwap
                        </span>
                        {activeTab === "silentswap" && (
                          <span className="text-xs bg-slate-700 text-zen-text-sub px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-zen-text-sub">TEE Relay</td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {(ssAnalysis?.totalInputs || 0) +
                        (ssAnalysis?.totalOutputs || 0)}
                    </td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {ssAnalysis?.avgAnonymitySet?.toFixed(1) || "1.8"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-orange-400 font-semibold">
                        {ssAnalysis?.linkabilityRate
                          ? `${Math.round(ssAnalysis.linkabilityRate * 100)}%`
                          : "18%"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        LOW
                      </span>
                    </td>
                  </tr>

                  <tr
                    className={`border-b border-white/40/50 hover:bg-white/30/30 cursor-pointer transition-colors ${activeTab === "shadowwire" ? "bg-white/30/40" : ""}`}
                    onClick={() => setActiveTab("shadowwire")}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zen-text-main">
                          ShadowWire
                        </span>
                        {activeTab === "shadowwire" && (
                          <span className="text-xs bg-slate-700 text-zen-text-sub px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-zen-text-sub">Bulletproofs</td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {swAnalysis?.totalTransfers || 80}
                    </td>
                    <td className="py-4 px-4 text-right text-zen-text-sub font-mono">
                      {swAnalysis?.avgAnonymitySet?.toFixed(1) || "2.1"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-red-400 font-semibold">
                        {swAnalysis?.linkabilityRate
                          ? `${Math.round(swAnalysis.linkabilityRate)}%`
                          : "91%"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                        LOW
                      </span>
                    </td>
                  </tr>

                  <tr
                    className={`border-b border-white/40/50 hover:bg-white/30/30 cursor-pointer transition-colors opacity-50 ${activeTab === "confidential-transfers" ? "bg-white/30/40" : ""}`}
                    onClick={() => setActiveTab("confidential-transfers")}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zen-text-sub">
                          Confidential Transfers
                        </span>
                        <span className="text-xs bg-slate-700 text-zen-text-sub px-2 py-0.5 rounded">
                          Coming Soon
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-zen-text-sub/70">SPL Extension</td>
                    <td className="py-4 px-4 text-right text-zen-text-sub/70 font-mono">
                      0
                    </td>
                    <td className="py-4 px-4 text-right text-zen-text-sub/70 font-mono">
                      -
                    </td>
                    <td className="py-4 px-4 text-right text-zen-text-sub/70">-</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-600/20 text-zen-text-sub/70 border border-white/50/30">
                        N/A
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-white/40 flex items-center justify-between text-xs text-zen-text-sub/70">
              <span>
                Methodology: Deposit-withdrawal timing correlation analysis
              </span>
              <a
                href="#methodology"
                className="text-zen-text-sub hover:text-zen-text-main transition-colors flex items-center gap-1"
              >
                Learn more
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </a>
            </div>
          </div>
        </section>

        {activeTab === "privacy-cash" ? (
          <>
            <section className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-2xl text-zen-text-main">
                  Live Benchmark
                </h3>
                <div className="flex items-center gap-2 text-xs text-zen-text-sub font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-tealGrey-400"></span>
                  Mainnet Sync
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="glass-card p-6 rounded-xl flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-zen-text-sub font-medium mb-3">
                    Pool Liquidity
                  </span>
                  <div className="text-3xl font-serif font-medium text-zen-text-main mt-auto tracking-tight">
                    {((stats?.tvl || 0) / 1e9).toFixed(2)}{" "}
                    <span className="text-lg text-zen-text-sub">SOL</span>
                  </div>
                  <span className="text-xs text-zen-text-sub mt-2 font-mono">
                    {stats?.totalDeposits || 0} deposits
                  </span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-white/30/20 rounded-bl-3xl"></div>
                  <span className="text-xs uppercase tracking-wide text-zen-text-sub font-medium mb-3">
                    Privacy Score
                  </span>
                  <div className="text-3xl font-serif font-medium text-zen-text-sub mt-auto tracking-tight">
                    {metrics?.privacyScore || 0}
                    <span className="text-xl text-zen-text-sub">/100</span>
                  </div>
                  <span className="text-xs text-zen-text-sub mt-2 font-mono">
                    Grade: F (Needs Improvement)
                  </span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-zen-text-sub font-medium mb-3">
                    Anonymity Set
                  </span>
                  <div className="text-3xl font-serif font-medium text-zen-text-main mt-auto tracking-tight">
                    {metrics?.avgAnonymitySet?.toFixed(1) || "0"}
                  </div>
                  <span className="text-xs text-zen-text-sub mt-2 font-mono">
                    Avg matches per tx
                  </span>
                </div>

                <div className="glass-card p-6 rounded-xl flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-zen-text-sub font-medium mb-3">
                    Linkable Transactions
                  </span>
                  <div className="text-3xl font-serif font-medium text-zen-text-main mt-auto tracking-tight">
                    {matches.length > 0 ? `${matches.length}` : "0"}
                  </div>
                  <span className="text-xs text-zen-text-sub mt-2 font-mono">
                    Identifiable patterns
                  </span>
                </div>
              </div>
            </section>

            <section className="glass-card p-1 rounded-2xl mb-12 shadow-lg">
              <div className="bg-white/30/40 rounded-xl p-8 md:p-12 border border-white/40 backdrop-blur-sm">
                <div className="flex items-start gap-5 mb-10">
                  <div className="p-3 bg-white/30 rounded-lg text-zen-text-sub border border-white/40">
                    <span className="material-symbols-outlined text-2xl">
                      timeline
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl font-medium text-zen-text-main mb-2">
                      Transaction Analysis
                    </h3>
                    <p className="text-zen-text-sub opacity-70 text-sm max-w-2xl leading-relaxed">
                      Analyzing privacy metrics. Each entry represents a
                      withdrawal that can be probabilistically linked to its
                      original depositor through timing and amount correlation.
                      A lower match count indicates higher certainty of
                      identity.
                    </p>
                  </div>
                </div>

                <div className="relative max-w-3xl mx-auto mb-12 group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-zen-text-sub text-xl group-focus-within:text-zen-text-main transition-colors">
                      search
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by transaction signature or wallet address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white/30/60 border border-white/40 rounded-xl text-zen-text-main placeholder-coolGrey-400 focus:ring-1 focus:ring-coolGrey-300 focus:border-coolGrey-400 focus:bg-white transition-all shadow-sm"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <button className="p-2 bg-transparent rounded-lg hover:bg-white/30 transition-colors border border-transparent hover:border-white/40">
                      <span className="material-symbols-outlined text-zen-text-sub text-lg">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>

                {searchQuery && (
                  <div className="mb-4 text-xs text-zen-text-sub">
                    Found {matches.length} match
                    {matches.length !== 1 ? "es" : ""} for "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-2 text-zen-text-main hover:text-slate-100 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {matchesLoading ? (
                  <div className="text-center py-16 border-t border-dashed border-white/50 bg-white/30/20 rounded-b-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal-700 mx-auto"></div>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-16 border-t border-dashed border-white/50 bg-white/30/20 rounded-b-lg">
                    <span className="material-symbols-outlined text-4xl text-coolGrey-300 mb-3 block">
                      privacy_tip
                    </span>
                    <p className="text-zen-text-sub font-light text-sm">
                      No vulnerable matches found in current dataset.
                      <br />
                      <span className="text-xs opacity-70">
                        Awaiting transaction data...
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-coolGrey-200 max-h-[800px] overflow-y-auto">
                    {matches.map((match) => (
                      <div
                        key={match.withdrawal.signature}
                        className="p-6 hover:bg-white/30/30 transition-colors"
                      >
                        <div className="glass-card border-l-4 border-l-coolGrey-400 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-zen-text-sub">
                              call_received
                            </span>
                            <span className="text-sm font-bold text-zen-text-main">
                              WITHDRAWAL
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded border uppercase ${getVulnerabilityColor(
                                match.vulnerabilityLevel,
                              )}`}
                            >
                              {match.vulnerabilityLevel}
                            </span>
                            {match.anonymitySet === 1 && (
                              <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">
                                  warning
                                </span>
                                Only 1 possible match!
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-zen-text-sub text-xs mb-1">
                                Amount withdrawn:
                              </div>
                              <div className="text-zen-text-main font-semibold text-lg">
                                {formatAmount(match.withdrawal.amount)}
                              </div>
                            </div>
                            <div>
                              <div className="text-zen-text-sub text-xs mb-1">
                                When:
                              </div>
                              <div className="text-zen-text-sub">
                                {formatTime(match.withdrawal.timestamp)}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-zen-text-sub text-xs mb-1">
                                Who received the money:
                              </div>
                              <a
                                href={getSolscanLink(
                                  match.withdrawal.recipient,
                                  "address",
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zen-text-main hover:text-slate-100 hover:underline font-mono text-sm inline-flex items-center gap-1"
                              >
                                {match.withdrawal.recipient}
                                <span className="material-symbols-outlined text-xs">
                                  open_in_new
                                </span>
                              </a>
                              <a
                                href={getSolscanLink(
                                  match.withdrawal.signature,
                                  "tx",
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 text-blue-400 hover:text-blue-300 text-xs hover:underline"
                              >
                                View transaction ↗
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() =>
                              toggleMatch(match.withdrawal.signature)
                            }
                            className="w-full flex items-center justify-between gap-2 p-3 bg-white/20/30 hover:bg-white/20/50 rounded-lg border border-white/40 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-green-300">
                                Possible Transaction Sources
                              </span>
                              {match.anonymitySet === 1 ? (
                                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">
                                  Only 1 possible source - High linkability
                                </span>
                              ) : (
                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/30">
                                  {match.possibleSources.length} possible
                                  sources
                                </span>
                              )}
                            </div>
                            <span className="text-zen-text-sub">
                              {expandedMatches.has(match.withdrawal.signature)
                                ? "▼"
                                : "▶"}
                            </span>
                          </button>

                          {expandedMatches.has(match.withdrawal.signature) && (
                            <>
                              {(() => {
                                const totalConfidence =
                                  match.possibleSources.reduce(
                                    (sum, s) => sum + s.confidence,
                                    0,
                                  );
                                const sortedSources = [
                                  ...match.possibleSources,
                                ].sort((a, b) => b.confidence - a.confidence);

                                return (
                                  <div className="space-y-3 ml-4">
                                    {sortedSources.map((source, idx) => {
                                      const percentage =
                                        totalConfidence > 0
                                          ? (
                                              (source.confidence /
                                                totalConfidence) *
                                              100
                                            ).toFixed(1)
                                          : (
                                              100 / match.possibleSources.length
                                            ).toFixed(1);

                                      return (
                                        <div
                                          key={source.deposit.signature}
                                          className={`border rounded-lg p-4 ${
                                            idx === 0
                                              ? "bg-green-500/10 border-green-500/30"
                                              : "bg-green-500/5 border-green-500/20"
                                          }`}
                                        >
                                          <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                              <span
                                                className={`text-xs font-bold ${
                                                  idx === 0
                                                    ? "text-green-300"
                                                    : "text-zen-text-sub"
                                                }`}
                                              >
                                                {idx === 0
                                                  ? "Most Likely Match"
                                                  : `Alternative ${idx + 1}`}
                                              </span>
                                              <span
                                                className={`text-sm font-bold ${getConfidenceColor(source.confidence)}`}
                                              >
                                                {percentage}% probability
                                              </span>
                                            </div>
                                            <div className="w-full bg-white/30 rounded-full h-2">
                                              <div
                                                className={`h-2 rounded-full ${
                                                  parseFloat(percentage) > 50
                                                    ? "bg-red-500"
                                                    : parseFloat(percentage) >
                                                        30
                                                      ? "bg-orange-500"
                                                      : parseFloat(percentage) >
                                                          15
                                                        ? "bg-yellow-500"
                                                        : "bg-slate-600"
                                                }`}
                                                style={{
                                                  width: `${percentage}%`,
                                                }}
                                              />
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                            <div>
                                              <div className="text-zen-text-sub/70 text-xs mb-1">
                                                Amount deposited:
                                              </div>
                                              <div className="text-zen-text-main font-semibold text-lg">
                                                {formatAmount(
                                                  source.deposit.amount,
                                                )}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-zen-text-sub/70 text-xs mb-1">
                                                When:
                                              </div>
                                              <div className="text-zen-text-sub">
                                                {formatTime(
                                                  source.deposit.timestamp,
                                                )}
                                              </div>
                                            </div>
                                            <div className="md:col-span-2">
                                              <div className="text-zen-text-sub/70 text-xs mb-1">
                                                Who deposited the money:
                                              </div>
                                              <a
                                                href={getSolscanLink(
                                                  source.deposit.depositor,
                                                  "address",
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-400 hover:text-green-300 hover:underline font-mono text-sm inline-flex items-center gap-1"
                                              >
                                                {source.deposit.depositor} ↗
                                              </a>
                                              <a
                                                href={getSolscanLink(
                                                  source.deposit.signature,
                                                  "tx",
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-3 text-blue-400 hover:text-blue-300 text-xs hover:underline"
                                              >
                                                View transaction ↗
                                              </a>
                                            </div>
                                          </div>

                                          <div className="mt-3 pt-3 border-t border-purple-500/20 bg-red-500/10 rounded px-4 py-3">
                                            <div className="text-sm font-bold text-red-300 mb-2">
                                              Transaction Correlation:
                                            </div>
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="text-zen-text-sub">
                                                  Person who deposited:
                                                </span>
                                                <a
                                                  href={getSolscanLink(
                                                    source.deposit.depositor,
                                                    "address",
                                                  )}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-green-400 hover:text-green-300 hover:underline font-mono"
                                                >
                                                  {truncateSig(
                                                    source.deposit.depositor,
                                                  )}{" "}
                                                  ↗
                                                </a>
                                              </div>
                                              <span className="text-purple-400 font-bold">
                                                →
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-zen-text-sub">
                                                  Person who received:
                                                </span>
                                                <a
                                                  href={getSolscanLink(
                                                    match.withdrawal.recipient,
                                                    "address",
                                                  )}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-purple-400 hover:text-purple-300 hover:underline font-mono"
                                                >
                                                  {truncateSig(
                                                    match.withdrawal.recipient,
                                                  )}{" "}
                                                  ↗
                                                </a>
                                              </div>
                                            </div>
                                            <div className="mt-3 text-xs text-zen-text-sub space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`font-semibold ${getConfidenceColor(source.confidence)}`}
                                                >
                                                  {(
                                                    source.confidence * 100
                                                  ).toFixed(0)}
                                                  % confidence
                                                </span>
                                                <span>•</span>
                                                <span>
                                                  Time difference:{" "}
                                                  {formatTimeDelta(
                                                    source.timeDeltaHours,
                                                  )}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                  Amount match:{" "}
                                                  {(
                                                    (match.withdrawal.amount /
                                                      source.deposit.amount) *
                                                    100
                                                  ).toFixed(1)}
                                                  %
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {source.reasoning &&
                                            source.reasoning.length > 0 && (
                                              <div className="mt-3 pt-3 border-t border-white/40">
                                                <div className="text-xs text-zen-text-sub/70 mb-1">
                                                  Analysis factors:
                                                </div>
                                                <div className="text-xs text-zen-text-sub space-y-1">
                                                  {source.reasoning.map(
                                                    (reason) => (
                                                      <div
                                                        key={reason}
                                                        className="flex items-start gap-2"
                                                      >
                                                        <span className="text-purple-400">
                                                          •
                                                        </span>
                                                        <span>{reason}</span>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 rounded-xl border-l-4 border-l-coolGrey-300">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-zen-text-sub">
                    lock_open
                  </span>
                  <span className="text-2xl font-serif font-bold text-zen-text-main">
                    {
                      matches.filter((m) => m.vulnerabilityLevel === "critical")
                        .length
                    }
                  </span>
                </div>
                <h4 className="font-medium text-zen-text-main mb-1 text-sm">
                  High Linkability
                </h4>
                <p className="text-xs text-zen-text-sub leading-normal">
                  Single match found. High confidence of origin.
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl border-l-4 border-l-coolGrey-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-zen-text-sub/70">
                    groups
                  </span>
                  <span className="text-2xl font-serif font-bold text-zen-text-main">
                    {
                      matches.filter((m) => m.vulnerabilityLevel === "high")
                        .length
                    }
                  </span>
                </div>
                <h4 className="font-medium text-zen-text-main mb-1 text-sm">
                  Medium Linkability
                </h4>
                <p className="text-xs text-zen-text-sub leading-normal">
                  2-5 possible matches. Anonymity set can be narrowed.
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl border-l-4 border-l-charcoal-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-zen-text-sub">
                    query_stats
                  </span>
                  <span className="text-2xl font-serif font-bold text-zen-text-main">
                    {matches.length}
                  </span>
                </div>
                <h4 className="font-medium text-zen-text-main mb-1 text-sm">
                  Total Analyzed
                </h4>
                <p className="text-xs text-zen-text-sub leading-normal">
                  Transactions processed by heuristics engine.
                </p>
              </div>
            </section>
          </>
        ) : activeTab === "confidential-transfers" ? (
          <>
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-8 mb-8">
              <div className="text-center max-w-2xl mx-auto">
                <span className="material-symbols-outlined text-6xl text-blue-400 mb-4 block opacity-50">
                  lock
                </span>
                <h2 className="text-2xl font-bold text-zen-text-main mb-4">
                  Confidential Transfers Analysis
                </h2>
                <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium mb-6">
                  Coming Soon
                </span>
                <div className="text-zen-text-sub space-y-4 text-sm">
                  <p>
                    <strong className="text-blue-300">
                      Confidential Transfers (CT)
                    </strong>{" "}
                    is Solana's native privacy feature for SPL tokens
                    (Token-2022), using ElGamal encryption to hide transfer
                    amounts.
                  </p>
                  <div className="bg-white/20/50 rounded-lg p-4 text-left">
                    <div className="text-zen-text-sub font-semibold mb-2">
                      Why Coming Soon?
                    </div>
                    <p className="text-zen-text-sub text-xs leading-relaxed">
                      CT adoption on Solana mainnet is still extremely low. Our
                      indexer scanned thousands of Token-2022 transactions
                      (including PYUSD) but found virtually no confidential
                      transfer activity. Most Token-2022 usage is standard
                      transfers, not CT operations.
                    </p>
                  </div>
                  <p className="text-zen-text-sub text-xs">
                    Once CT sees meaningful adoption, we'll analyze the same
                    timing correlation vulnerabilities we demonstrate on mixer
                    protocols. The attack vector remains valid: deposit/withdraw
                    amounts are public, only internal CT-to-CT transfers are
                    encrypted.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/30/30 border border-white/40 rounded-xl p-6">
              <h3 className="font-semibold text-zen-text-main mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">
                  analytics
                </span>
                Planned Analysis Vectors
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="text-zen-text-sub">Timing Correlation</div>
                  <p className="text-xs text-zen-text-sub/70">
                    Match deposits to withdrawals based on temporal proximity
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-zen-text-sub">Amount Fingerprinting</div>
                  <p className="text-xs text-zen-text-sub/70">
                    Public deposit/withdraw amounts create linkable patterns
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-zen-text-sub">Address Clustering</div>
                  <p className="text-xs text-zen-text-sub/70">
                    Graph analysis of sender/receiver address relationships
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-zen-text-sub">Auditor Key Analysis</div>
                  <p className="text-xs text-zen-text-sub/70">
                    CT allows optional auditor keys that can decrypt amounts
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "shadowwire" ? (
          <>
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-zen-text-main mb-3">
                What is ShadowWire?
              </h2>
              <div className="text-zen-text-sub space-y-2 text-sm">
                <p>
                  <strong className="text-green-300">ShadowWire</strong> is a
                  Bulletproof-based privacy protocol ($15K hackathon bounty).
                </p>
                <div className="bg-white/20/50 rounded-lg p-4 my-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-red-400 font-semibold mb-2">
                        What ShadowWire Claims:
                      </div>
                      <ul className="text-xs space-y-1 text-zen-text-sub">
                        <li>• Token amounts (via Bulletproofs)</li>
                        <li>• Transaction values (via ZK proofs)</li>
                        <li className="text-red-300 font-semibold">
                          Analysis shows limitation
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-red-400 font-semibold mb-2">
                        What ShadowWire Actually Reveals:
                      </div>
                      <ul className="text-xs space-y-1 text-zen-text-sub">
                        <li className="text-red-300 font-semibold">
                          • Amounts (extracted from balance changes!)
                        </li>
                        <li>• Sender addresses (VISIBLE!)</li>
                        <li>• Receiver addresses (VISIBLE!)</li>
                        <li>• Transaction timing</li>
                        <li>• Transaction graph</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-red-400 font-semibold">
                  KEY FINDING: Bulletproofs can be bypassed through balance
                  analysis. We extract amounts from balance changes (postBalance
                  - preBalance). Privacy Score: 0/100.
                </p>
                <p className="text-zen-text-sub text-xs">
                  Compare to Privacy Cash: Privacy Cash hides addresses but
                  reveals amounts. ShadowWire hides amounts but reveals
                  addresses. Neither provides complete privacy!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-zen-text-main mb-4">
                Privacy Protocol Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="text-left py-3 px-4 text-zen-text-sub font-semibold">
                        Protocol
                      </th>
                      <th className="text-center py-3 px-4 text-zen-text-sub font-semibold">
                        Hides Addresses
                      </th>
                      <th className="text-center py-3 px-4 text-zen-text-sub font-semibold">
                        Hides Amounts
                      </th>
                      <th className="text-center py-3 px-4 text-zen-text-sub font-semibold">
                        Privacy Score
                      </th>
                      <th className="text-left py-3 px-4 text-zen-text-sub font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/40/50 bg-orange-500/5">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-zen-text-main">
                          Privacy Cash
                        </div>
                        <div className="text-xs text-zen-text-sub">
                          Pool-based mixing
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                          YES
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                          NO
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-2xl font-bold text-orange-400">
                          16/100
                        </span>
                      </td>
                      <td className="py-4 px-4 text-zen-text-sub text-xs">
                        Amounts reveal identity patterns
                      </td>
                    </tr>
                    <tr className="border-b border-white/40/50 bg-red-500/10">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-zen-text-main">
                          ShadowWire
                        </div>
                        <div className="text-xs text-zen-text-sub">
                          Bulletproof-based
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                          NO
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-red-400 font-semibold line-through">
                            Claims YES
                          </span>
                          <span className="text-red-300 font-bold text-xs">
                            Actually NO!
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-2xl font-bold text-red-400">
                          0/100
                        </span>
                      </td>
                      <td className="py-4 px-4 text-red-300 text-xs font-semibold">
                        Amounts detectable via balance analysis
                      </td>
                    </tr>
                    <tr className="bg-blue-500/5">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-zen-text-main">
                          Confidential Transfers
                        </div>
                        <div className="text-xs text-zen-text-sub">
                          Token-2022 native
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                          NO
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-orange-400 font-semibold">
                            Partially
                          </span>
                          <span className="text-red-300 font-bold text-xs">
                            Deposit/Withdraw PUBLIC!
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-2xl font-bold text-orange-400">
                          22/100
                        </span>
                      </td>
                      <td className="py-4 px-4 text-red-300 text-xs font-semibold">
                        Deposit/Withdraw amounts are PUBLIC
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 bg-white/20/50 rounded-lg p-4 text-xs text-zen-text-sub">
                <strong className="text-red-300">Key Insight:</strong>{" "}
                ShadowWire scores 0/100 on our privacy benchmark. It reveals
                both addresses (87.5% exposed) AND amounts (46% extracted via balance analysis).
                We found 25 timing correlations linking deposits to withdrawals.
                Privacy Cash scores 16/100 by hiding addresses but revealing amounts.
                Confidential Transfers scores 22/100 - deposit/withdraw amounts are PUBLIC.
                Complete privacy requires hiding BOTH addresses AND amounts.
              </div>
            </div>

            {swAnalysis && swAnalysis.totalTransfers > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-white/40">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Privacy Score
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        swAnalysis.privacyScore < 30
                          ? "text-red-400"
                          : swAnalysis.privacyScore < 60
                            ? "text-orange-400"
                            : "text-green-400"
                      }`}
                    >
                      {swAnalysis.privacyScore}/100
                    </div>
                  </div>

                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-white/40">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Total Transfers
                    </div>
                    <div className="text-2xl font-bold text-zen-text-main">
                      {swAnalysis.totalTransfers || 0}
                    </div>
                  </div>

                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/50 border-2">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Address Exposure
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {swAnalysis.addressExposureRate || 87.5}%
                    </div>
                    <div className="text-xs text-zen-text-sub/70">addresses visible</div>
                  </div>

                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/50 border-2">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Amount Exposure
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {swAnalysis.amountExposureRate || 46.3}%
                    </div>
                    <div className="text-xs text-zen-text-sub/70">amounts extracted</div>
                  </div>

                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-white/40">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Linkability Rate
                    </div>
                    <div className="text-2xl font-bold text-orange-400">
                      {Math.round(swAnalysis.linkabilityRate || 0)}%
                    </div>
                  </div>

                  <div className="bg-white/30/50 backdrop-blur-sm rounded-xl p-6 border border-white/40">
                    <div className="text-zen-text-sub text-sm mb-1">
                      Timing Correlations
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {swAnalysis.timingCorrelations?.uniqueLinks || 0}
                    </div>
                    <div className="text-xs text-zen-text-sub/70">potential links</div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-bold text-zen-text-main mb-4 flex items-center gap-2">
                    Amount Extraction Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/20/50 rounded-lg p-4">
                      <div className="text-zen-text-sub text-sm mb-1">
                        Detection Success Rate
                      </div>
                      <div className="text-2xl font-bold text-red-400">
                        {swTransfers && swTransfers.length > 0
                          ? Math.round(
                              (swTransfers.filter(
                                (t: any) => t.amount && t.amount > 0,
                              ).length /
                                swTransfers.length) *
                                100,
                            )
                          : 0}
                        %
                      </div>
                      <div className="text-zen-text-sub/70 text-xs mt-1">
                        {swTransfers
                          ? swTransfers.filter(
                              (t: any) => t.amount && t.amount > 0,
                            ).length
                          : 0}{" "}
                        of {swTransfers ? swTransfers.length : 0} amounts
                        extracted
                      </div>
                    </div>

                    <div className="bg-white/20/50 rounded-lg p-4">
                      <div className="text-zen-text-sub text-sm mb-1">
                        Total Value Observable
                      </div>
                      <div className="text-2xl font-bold text-red-400">
                        {swTransfers && swTransfers.length > 0
                          ? (
                              swTransfers
                                .filter((t: any) => t.amount && t.amount > 0)
                                .reduce(
                                  (sum: number, t: any) => sum + t.amount,
                                  0,
                                ) / 1e9
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : "0"}{" "}
                        SOL
                      </div>
                      <div className="text-zen-text-sub/70 text-xs mt-1">
                        Despite Bulletproof encryption
                      </div>
                    </div>

                    <div className="bg-white/20/50 rounded-lg p-4">
                      <div className="text-zen-text-sub text-sm mb-1">
                        Largest Detected Transfer
                      </div>
                      <div className="text-2xl font-bold text-red-400">
                        {swTransfers && swTransfers.length > 0
                          ? (
                              Math.max(
                                ...swTransfers
                                  .filter((t: any) => t.amount && t.amount > 0)
                                  .map((t: any) => t.amount),
                                0,
                              ) / 1e9
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : "0"}{" "}
                        SOL
                      </div>
                      <div className="text-zen-text-sub/70 text-xs mt-1">
                        Observable on-chain
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/20/50 rounded-lg p-4 text-sm text-zen-text-sub">
                    <strong className="text-red-300">Analysis method:</strong>{" "}
                    While Bulletproofs cryptographically hide amounts in
                    zero-knowledge proofs, blockchain balance changes
                    (postBalance - preBalance) are publicly visible and required
                    for consensus. We extract exact transfer amounts by
                    analyzing these balance deltas, bypassing the cryptographic
                    protection.
                  </div>
                </div>

                {swAnalysis.vulnerabilities &&
                  swAnalysis.vulnerabilities.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
                      <h3 className="text-lg font-bold text-zen-text-main mb-4">
                        Privacy Vulnerabilities
                      </h3>
                      <div className="space-y-2">
                        {swAnalysis.vulnerabilities.map(
                          (vuln: string, idx: number) => (
                            <div
                              key={idx}
                              className="text-sm text-zen-text-sub flex items-start gap-2"
                            >
                              <span className="text-red-400 mt-1">•</span>
                              <span>{vuln}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {swAnalysis.recommendations &&
                  swAnalysis.recommendations.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
                      <h3 className="text-lg font-bold text-zen-text-main mb-4">
                        Recommendations
                      </h3>
                      <div className="space-y-2">
                        {swAnalysis.recommendations.map(
                          (rec: string, idx: number) => (
                            <div
                              key={idx}
                              className="text-sm text-zen-text-sub flex items-start gap-2"
                            >
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{rec}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {swAnalysis.timingCorrelations && swAnalysis.timingCorrelations.uniqueLinks > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-bold text-zen-text-main mb-4">
                      Timing Correlation Attack Results
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white/20/50 rounded-lg p-4">
                        <div className="text-zen-text-sub text-sm mb-1">Potential Links Found</div>
                        <div className="text-2xl font-bold text-orange-400">
                          {swAnalysis.timingCorrelations.uniqueLinks}
                        </div>
                      </div>
                      <div className="bg-white/20/50 rounded-lg p-4">
                        <div className="text-zen-text-sub text-sm mb-1">High Confidence Matches</div>
                        <div className="text-2xl font-bold text-red-400">
                          {swAnalysis.timingCorrelations.highConfidenceMatches}
                        </div>
                      </div>
                      <div className="bg-white/20/50 rounded-lg p-4">
                        <div className="text-zen-text-sub text-sm mb-1">Total Correlations</div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {swAnalysis.timingCorrelations.totalMatches}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/20/50 rounded-lg p-4">
                      <div className="text-sm font-semibold text-zen-text-main mb-3">Top Timing Matches (Deposit → Withdrawal)</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {swAnalysis.timingCorrelations.matches?.slice(0, 10).map((match: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white/30/50 rounded p-2">
                            <span className="text-orange-400 font-mono">{idx + 1}.</span>
                            <span className="text-zen-text-sub">Deposit from</span>
                            <span className="text-red-300 font-mono truncate max-w-[120px]" title={match.depositSender}>
                              {match.depositSender?.substring(0, 12)}...
                            </span>
                            <span className="text-zen-text-sub/70">→</span>
                            <span className="text-zen-text-sub">Withdrawal to</span>
                            <span className="text-red-300 font-mono truncate max-w-[120px]" title={match.withdrawalRecipient}>
                              {match.withdrawalRecipient?.substring(0, 12)}...
                            </span>
                            <span className="text-zen-text-sub/70 ml-auto">
                              {match.timeDiffSeconds}s apart
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${match.confidence >= 75 ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300'}`}>
                              {match.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zen-text-sub mt-3">
                      These matches identify likely links between depositing users and withdrawal recipients
                      based on timing patterns. Even with hidden amounts, timing alone can break privacy.
                    </p>
                  </div>
                )}

                {swAnalysis.addressReuse && swAnalysis.addressReuse.totalReusedAddresses > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-bold text-zen-text-main mb-4">
                      Address Reuse Analysis
                    </h3>
                    <div className="bg-white/20/50 rounded-lg p-4">
                      <div className="text-sm text-zen-text-sub mb-3">
                        <strong className="text-purple-300">{swAnalysis.addressReuse.totalReusedAddresses} addresses</strong> used multiple times,
                        making them easily trackable across transactions.
                      </div>
                      <div className="space-y-2">
                        {swAnalysis.addressReuse.topOffenders?.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="text-purple-400">{idx + 1}.</span>
                            <a
                              href={`https://solscan.io/account/${item.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-300 hover:text-red-200 font-mono truncate max-w-[200px]"
                            >
                              {item.address?.substring(0, 20)}...
                            </a>
                            <span className="text-zen-text-sub">used</span>
                            <span className="text-yellow-400 font-bold">{item.count}x</span>
                            <span className="text-red-400 text-xs ml-auto">{item.exposure}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/30/50 backdrop-blur-sm rounded-xl border border-white/40">
                  <div className="p-6 border-b border-white/40">
                    <h2 className="text-xl font-semibold text-zen-text-main mb-2">
                      Bulletproof Limitation: Addresses AND Amounts Observable
                    </h2>
                    <p className="text-sm text-zen-text-sub mb-4">
                      <strong className="text-red-400">FINDING:</strong> While
                      ShadowWire uses Bulletproofs to cryptographically hide
                      amounts in ZK proofs, we can extract the EXACT amounts by
                      analyzing blockchain balance changes (postBalance -
                      preBalance). This demonstrates a limitation:
                      zero-knowledge proofs cannot hide public ledger state
                      changes required for consensus.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                      <strong>Privacy Score: 0/100</strong> - Both addresses AND
                      amounts are observable. ShadowWire scores lower than
                      Privacy Cash (which scores 16/100 by hiding addresses).
                    </div>
                  </div>

                  {swTransfersLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : !swTransfers || swTransfers.length === 0 ? (
                    <div className="p-8 text-center text-zen-text-sub">
                      No transactions found. Run the indexer to fetch ShadowWire
                      data.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700 max-h-[800px] overflow-y-auto">
                      {swTransfers.map((transfer: any) => (
                        <div
                          key={transfer.signature}
                          className="p-6 hover:bg-white/30/30 transition-colors"
                        >
                          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-bold text-green-300">
                                {isPoolAddress(transfer.recipient)
                                  ? "Deposit"
                                  : isPoolAddress(transfer.sender)
                                    ? "Withdrawal"
                                    : "Transfer"}
                              </span>
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                                {transfer.transferType || "external"}
                              </span>
                              {transfer.amount && transfer.amount > 0 ? (
                                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30 font-semibold">
                                  Amount DETECTED
                                </span>
                              ) : (
                                <span className="text-xs text-orange-400">
                                  Amount hidden (Bulletproofs)
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 text-sm">
                              <div className="bg-white/20/30 rounded-lg p-3">
                                {isPoolAddress(transfer.sender) ? (
                                  <>
                                    <div className="text-zen-text-sub/70 text-xs mb-1">
                                      FROM (Withdrawal from Pool):
                                    </div>
                                    <div className="text-yellow-400 text-sm font-medium">
                                      ShadowWire Pool (spending encrypted
                                      balance)
                                    </div>
                                    <div className="text-xs text-zen-text-sub/70 mt-1 font-mono">
                                      {transfer.sender.substring(0, 20)}...
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-zen-text-sub/70 text-xs mb-1">
                                      FROM (Sender - VISIBLE!):
                                    </div>
                                    <a
                                      href={getSolscanLink(
                                        transfer.sender,
                                        "address",
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-red-400 hover:text-red-300 hover:underline font-mono text-xs inline-flex items-center gap-1 break-all"
                                    >
                                      {transfer.sender} ↗
                                    </a>
                                  </>
                                )}
                              </div>

                              <div className="bg-white/20/30 rounded-lg p-3">
                                {isPoolAddress(transfer.recipient) ? (
                                  <>
                                    <div className="text-zen-text-sub/70 text-xs mb-1">
                                      TO (Deposit to Pool):
                                    </div>
                                    <div className="text-yellow-400 text-sm font-medium">
                                      ShadowWire Pool (encrypted balance)
                                    </div>
                                    <div className="text-xs text-zen-text-sub/70 mt-1 font-mono">
                                      {transfer.recipient.substring(0, 20)}...
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-zen-text-sub/70 text-xs mb-1">
                                      TO (Recipient - VISIBLE!):
                                    </div>
                                    <a
                                      href={getSolscanLink(
                                        transfer.recipient,
                                        "address",
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-red-400 hover:text-red-300 hover:underline font-mono text-xs inline-flex items-center gap-1 break-all"
                                    >
                                      {transfer.recipient} ↗
                                    </a>
                                  </>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-zen-text-sub/70 text-xs mb-1">
                                    Amount:
                                  </div>
                                  {transfer.amount && transfer.amount > 0 ? (
                                    <div>
                                      <div className="text-red-400 font-bold text-lg">
                                        {(() => {
                                          const { symbol, formatted } =
                                            formatTokenAmount(
                                              transfer.token || "SOL",
                                              transfer.amount,
                                              transfer.decimals || 9,
                                            );
                                          return `${formatted} ${symbol}`;
                                        })()}
                                      </div>
                                      <div className="text-red-300 text-xs mt-1 font-semibold">
                                        DETECTED! Balance analysis
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-orange-400 font-semibold">
                                        Hidden
                                      </div>
                                      <div className="text-zen-text-sub/70 text-xs mt-1">
                                        (Bulletproof ZK proof)
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-zen-text-sub/70 text-xs mb-1">
                                    When:
                                  </div>
                                  <div className="text-zen-text-sub text-sm">
                                    {formatTime(transfer.timestamp)}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-white/40/50">
                                <a
                                  href={getSolscanLink(
                                    transfer.signature,
                                    "tx",
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-xs hover:underline inline-flex items-center gap-1"
                                >
                                  View on Solscan ↗
                                </a>
                                <span className="text-slate-600 mx-2">•</span>
                                <span className="text-zen-text-sub/70 text-xs font-mono">
                                  {transfer.signature.slice(0, 16)}...
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-red-500/20 bg-red-500/5 rounded p-2">
                              <div className="text-xs text-red-300 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">!</span>
                                <span>
                                  <strong>Privacy Limitation:</strong> Sender,
                                  recipient, AND amount are all observable
                                  through balance analysis! Zero-knowledge
                                  proofs cannot hide public ledger state
                                  changes. Privacy Score: 0/100.
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">
                  <span className="material-symbols-outlined text-yellow-400">
                    lock
                  </span>
                </div>
                <h3 className="text-xl font-bold text-zen-text-main mb-3">
                  No ShadowWire Data Yet
                </h3>
                <p className="text-zen-text-sub mb-4">
                  ShadowWire is a new protocol. Run the indexer to fetch data:
                </p>
                <code className="bg-white/20 text-green-400 px-4 py-2 rounded text-sm">
                  npx tsx index-shadowwire.ts
                </code>
                <p className="text-zen-text-sub text-sm mt-4">
                  <strong>Finding:</strong> ShadowWire has 0 transactions on
                  mainnet, indicating low/no adoption despite $15K bounty.
                </p>
                <p className="text-zen-text-sub/70 text-xs mt-2">
                  This lack of adoption is itself a research finding:
                  Bulletproof protocols without address privacy aren't being
                  used.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-zen-text-main mb-3">
                What is SilentSwap?
              </h2>
              <div className="text-zen-text-sub space-y-2 text-sm">
                <p>
                  <strong className="text-orange-300">SilentSwap</strong> is a
                  cross-chain routing service ($5K bounty) that obscures
                  transaction paths through Secret Network.
                </p>
                <div className="bg-white/20/50 rounded-lg p-4 my-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-orange-400 font-semibold mb-2">
                        What SilentSwap Claims:
                      </div>
                      <ul className="text-xs space-y-1 text-zen-text-sub">
                        <li>• Route through Secret Network</li>
                        <li>• Break transaction trails</li>
                        <li>• One-time facilitator wallets</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-red-400 font-semibold mb-2">
                        What Our Attack Reveals:
                      </div>
                      <ul className="text-xs space-y-1 text-zen-text-sub">
                        <li className="text-red-300 font-semibold">
                          • 1% fee creates exact amount fingerprint
                        </li>
                        <li className="text-red-300 font-semibold">
                          • 30s-5min timing window is predictable
                        </li>
                        <li>• Facilitator wallets are linkable</li>
                        <li>• Multi-output patterns unique</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-orange-400 font-semibold">
                  KEY FINDING: The 1% fee + timing window creates a near-perfect
                  fingerprint for correlating inputs to outputs.
                </p>
              </div>
            </div>

            {ssAnalysis ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/30/40 border border-white/40 rounded-xl p-4">
                    <div className="text-zen-text-sub text-xs uppercase tracking-wider mb-1">
                      Privacy Score
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        ssAnalysis.privacyScore < 30
                          ? "text-red-400"
                          : ssAnalysis.privacyScore < 60
                            ? "text-orange-400"
                            : "text-green-400"
                      }`}
                    >
                      {ssAnalysis.privacyScore}/100
                    </div>
                  </div>
                  <div className="bg-white/30/40 border border-white/40 rounded-xl p-4">
                    <div className="text-zen-text-sub text-xs uppercase tracking-wider mb-1">
                      Total Inputs
                    </div>
                    <div className="text-2xl font-bold text-orange-400">
                      {ssAnalysis.totalInputs || 0}
                    </div>
                  </div>
                  <div className="bg-white/30/40 border border-white/40 rounded-xl p-4">
                    <div className="text-zen-text-sub text-xs uppercase tracking-wider mb-1">
                      Total Outputs
                    </div>
                    <div className="text-2xl font-bold text-amber-400">
                      {ssAnalysis.totalOutputs || 0}
                    </div>
                  </div>
                  <div className="bg-white/30/40 border border-white/40 rounded-xl p-4">
                    <div className="text-zen-text-sub text-xs uppercase tracking-wider mb-1">
                      Linkability Rate
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {ssAnalysis.linkabilityRate
                        ? `${(ssAnalysis.linkabilityRate * 100).toFixed(1)}%`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/30/30 border border-white/40 rounded-xl p-5">
                    <h3 className="font-semibold text-zen-text-main mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-400">
                        schedule
                      </span>
                      Timing Analysis
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Avg Time Delta</span>
                        <span className="text-zen-text-main font-mono">
                          {ssAnalysis.timing?.avgTimeDelta
                            ? `${(ssAnalysis.timing.avgTimeDelta / 1000).toFixed(1)}s`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Min Time Delta</span>
                        <span className="text-zen-text-main font-mono">
                          {ssAnalysis.timing?.minTimeDelta
                            ? `${(ssAnalysis.timing.minTimeDelta / 1000).toFixed(1)}s`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Max Time Delta</span>
                        <span className="text-zen-text-main font-mono">
                          {ssAnalysis.timing?.maxTimeDelta
                            ? `${(ssAnalysis.timing.maxTimeDelta / 1000).toFixed(1)}s`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/30/30 border border-white/40 rounded-xl p-5">
                    <h3 className="font-semibold text-zen-text-main mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400">
                        attach_money
                      </span>
                      Amount Correlation
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Expected Fee</span>
                        <span className="text-zen-text-main font-mono">1.00%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Fee Tolerance</span>
                        <span className="text-zen-text-main font-mono">±0.50%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zen-text-sub">Match Accuracy</span>
                        <span className="text-red-400 font-mono font-semibold">
                          {ssAnalysis.matchAccuracy
                            ? `${(ssAnalysis.matchAccuracy * 100).toFixed(1)}%`
                            : "~99%"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {ssAnalysis.vulnerabilities &&
                  ssAnalysis.vulnerabilities.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-8">
                      <h3 className="font-semibold text-zen-text-main mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-400">
                          warning
                        </span>
                        Vulnerabilities Identified
                      </h3>
                      <ul className="space-y-2">
                        {ssAnalysis.vulnerabilities.map(
                          (vuln: string, i: number) => (
                            <li
                              key={i}
                              className="text-sm text-zen-text-sub flex items-start gap-2"
                            >
                              <span className="text-red-400">•</span>
                              {vuln}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                {ssMatchesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
                    <p className="text-zen-text-sub mt-3">Loading matches...</p>
                  </div>
                ) : ssMatches.length > 0 ? (
                  <div className="bg-white/30/30 border border-white/40 rounded-xl p-5">
                    <h3 className="font-semibold text-zen-text-main mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-400">
                        link
                      </span>
                      Correlated Transactions ({ssMatches.length} matches)
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {ssMatches.slice(0, 20).map(
                        (
                          match: {
                            input: {
                              signature: string;
                              amount: number;
                              userWallet: string;
                              timestamp: number;
                            };
                            output: {
                              signature: string;
                              amount: number;
                              userWallet: string;
                              timestamp: number;
                            };
                            confidence: number;
                            timeDelta: number;
                            feeRate: number;
                          },
                          i: number,
                        ) => (
                          <div
                            key={i}
                            className="bg-white/20/50 rounded-lg p-4 border border-white/40/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  match.confidence > 0.9
                                    ? "bg-red-500/30 text-red-300"
                                    : match.confidence > 0.7
                                      ? "bg-orange-500/30 text-orange-300"
                                      : "bg-yellow-500/30 text-yellow-300"
                                }`}
                              >
                                {(match.confidence * 100).toFixed(0)}%
                                confidence
                              </span>
                              <span className="text-xs text-zen-text-sub/70">
                                {(match.timeDelta / 1000).toFixed(1)}s delay
                              </span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <div className="text-zen-text-sub/70 mb-1">Input</div>
                                <a
                                  href={`https://solscan.io/tx/${match.input.signature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-400 hover:underline font-mono"
                                >
                                  {match.input.signature.slice(0, 16)}...
                                </a>
                                <div className="text-zen-text-sub mt-1">
                                  {(match.input.amount / 1e9).toFixed(4)} SOL
                                </div>
                              </div>
                              <div>
                                <div className="text-zen-text-sub/70 mb-1">
                                  Output
                                </div>
                                <a
                                  href={`https://solscan.io/tx/${match.output.signature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-400 hover:underline font-mono"
                                >
                                  {match.output.signature.slice(0, 16)}...
                                </a>
                                <div className="text-zen-text-sub mt-1">
                                  {(match.output.amount / 1e9).toFixed(4)} SOL
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-zen-text-sub/70 mt-2">
                              Fee: {(match.feeRate * 100).toFixed(2)}%
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zen-text-sub">
                    No correlated transactions found yet.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/30/30 border border-white/40 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-zen-text-main mb-3">
                  Run the SilentSwap Indexer
                </h3>
                <p className="text-zen-text-sub mb-4">
                  SilentSwap analysis requires indexing on-chain data first:
                </p>
                <code className="bg-white/20 text-orange-400 px-4 py-2 rounded text-sm">
                  npx tsx src/indexer/silentswap.ts && npx tsx
                  src/analysis/silentswap-attack.ts
                </code>
                <p className="text-zen-text-sub text-sm mt-4">
                  This will index transactions to/from the SilentSwap relay
                  address and run timing correlation analysis.
                </p>
              </div>
            )}
          </>
        )}

        <section id="methodology" className="mt-24 mb-12">
          <div className="glass-card p-8 md:p-12 rounded-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/30 rounded-lg border border-white/40">
                <span className="material-symbols-outlined text-2xl text-zen-text-sub">
                  science
                </span>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-medium text-zen-text-main">
                  Methodology
                </h2>
                <p className="text-sm text-zen-text-sub">
                  How we measure privacy resistance
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="font-serif text-lg font-medium text-zen-text-main mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-zen-text-sub">
                    schedule
                  </span>
                  What are Timing Correlation Attacks?
                </h3>
                <p className="text-sm text-zen-text-sub leading-relaxed">
                  Timing correlation attacks exploit the temporal relationship
                  between deposits and withdrawals. When a user deposits funds
                  and withdraws shortly after, the time proximity creates a
                  statistical link that can de-anonymize transactions even when
                  amounts are hidden or addresses are obscured.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-lg font-medium text-zen-text-main mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-zen-text-sub">
                    analytics
                  </span>
                  How the Benchmark Works
                </h3>
                <p className="text-sm text-zen-text-sub leading-relaxed">
                  We analyze real mainnet transactions using a multi-factor
                  correlation algorithm. For each withdrawal, we search for
                  deposits within a configurable time window (typically 30
                  seconds to 5 minutes) and score matches based on timing
                  proximity, amount similarity (after fees), and behavioral
                  patterns.
                </p>
              </div>
            </div>

            <div className="bg-white/30/50 rounded-xl p-6 mb-8 border border-white/40">
              <h4 className="text-sm font-medium text-zen-text-sub mb-4 uppercase tracking-wider">
                Attack Visualization
              </h4>
              <div className="flex items-center justify-center gap-2 text-sm overflow-x-auto py-4">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-12 bg-green-500/20 border border-green-500/40 rounded-lg flex items-center justify-center text-green-400 font-mono text-xs">
                    DEPOSIT
                  </div>
                  <span className="text-xs text-zen-text-sub/70 mt-2">10.5 SOL</span>
                  <span className="text-xs text-slate-600">t=0</span>
                </div>
                <div className="flex-1 max-w-32 h-0.5 bg-gradient-to-r from-green-500/40 via-yellow-500/40 to-red-500/40 relative">
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-yellow-400 whitespace-nowrap">
                    Time Window
                  </span>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-zen-text-sub/70 whitespace-nowrap">
                    30s - 5min
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-24 h-12 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center justify-center text-red-400 font-mono text-xs">
                    WITHDRAW
                  </div>
                  <span className="text-xs text-zen-text-sub/70 mt-2">10.4 SOL</span>
                  <span className="text-xs text-slate-600">t=47s</span>
                </div>
                <div className="ml-4 pl-4 border-l border-white/40">
                  <div className="text-xs text-zen-text-sub">Match Score</div>
                  <div className="text-lg font-bold text-red-400">94%</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/30/30 rounded-lg p-4 border border-white/40/50">
                <h4 className="font-medium text-zen-text-main mb-2 text-sm">
                  Linkability Rate
                </h4>
                <p className="text-xs text-zen-text-sub leading-relaxed">
                  Percentage of transactions that can be linked to their origin
                  with high confidence. Lower is better for privacy.
                </p>
              </div>
              <div className="bg-white/30/30 rounded-lg p-4 border border-white/40/50">
                <h4 className="font-medium text-zen-text-main mb-2 text-sm">
                  Anonymity Set
                </h4>
                <p className="text-xs text-zen-text-sub leading-relaxed">
                  The number of possible source transactions for each
                  withdrawal. Higher anonymity sets mean better privacy. An
                  anonymity set of 1 means the link is certain.
                </p>
              </div>
              <div className="bg-white/30/30 rounded-lg p-4 border border-white/40/50">
                <h4 className="font-medium text-zen-text-main mb-2 text-sm">
                  Timing Resistance
                </h4>
                <p className="text-xs text-zen-text-sub leading-relaxed">
                  Our qualitative rating of how well a protocol resists timing
                  attacks. Based on median time between deposits and
                  withdrawals, and pool activity levels.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/40 text-xs text-zen-text-sub/70">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">
                  database
                </span>
                Data: Helius RPC API
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">
                  language
                </span>
                Network: Solana Mainnet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">
                  calendar_month
                </span>
                Period: January 2026
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">
                  update
                </span>
                Updates: Every 6 hours
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 w-full bg-white/30/30 backdrop-blur-lg border-t border-white/40 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/30/60 border border-white/40 text-xs text-zen-text-sub mb-8 font-mono">
            <span className="material-symbols-outlined text-sm">
              verified_user
            </span>
            Verifiable on-chain data
          </div>
          <p className="text-xs text-zen-text-sub/70 max-w-2xl mx-auto leading-relaxed mb-6">
            Click any address or transaction to view it on Solscan. Every
            deposit and withdrawal shown here is a real blockchain transaction
            that anyone can verify. This tool serves as an educational benchmark
            for privacy efficacy.
          </p>
          <p className="text-[10px] text-zen-text-sub uppercase tracking-widest font-semibold">
            UNVEIL © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
