import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";

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

export function PrivacyCashPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

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

  const allMatches: Match[] = (matchData?.matches || [])
    .map((m: any) => ({
      ...m,
      possibleSources: (m.possibleSources || m.likelySources || []).map(
        (source: any) => ({
          ...source,
          timeDeltaHours: source.timeDeltaHours ?? source.timeDelta / (1000 * 60 * 60),
        }),
      ),
    }))
    .filter(
      (m: Match) =>
        m.possibleSources && Array.isArray(m.possibleSources) && m.possibleSources.length > 0,
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

  const formatAmount = (lamports: number) => (lamports / 1e9).toFixed(3) + " SOL";
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();
  const formatTimeDelta = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.floor(hours / 24)}d`;
  };
  const truncateSig = (sig: string) => `${sig.slice(0, 6)}...${sig.slice(-4)}`;
  const getSolscanLink = (address: string, type: "tx" | "address") =>
    `https://solscan.io/${type}/${address}`;

  const getVulnerabilityColor = (level: string) => {
    switch (level) {
      case "critical": return "text-zen-text-main bg-zen-text-main/5";
      case "high": return "text-zen-text-main bg-zen-text-main/5";
      case "medium": return "text-zen-text-sub bg-zen-text-main/5";
      default: return "text-zen-text-sub bg-zen-text-main/5";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-zen-text-main";
    if (confidence >= 0.6) return "text-zen-text-main";
    return "text-zen-text-sub";
  };

  const criticalMatches = matches.filter((m) => m.anonymitySet === 1).length;
  const highMatches = matches.filter((m) => m.anonymitySet > 1 && m.anonymitySet <= 3).length;

  return (
    <DashboardLayout title="Privacy Cash" subtitle="Analysis">
      {/* Warning Banner - Glass style */}
      <div className="bg-white/50 backdrop-blur-sm border border-zen-text-main/10 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 border border-zen-text-main/10 backdrop-blur flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-zen-text-main text-xl">warning</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zen-text-main mb-1">Timing Attack Vulnerable</h3>
            <p className="text-xs text-zen-text-sub leading-relaxed">
              Deposit-withdrawal timing creates linkable patterns. Unique amounts also create identifiable fingerprints.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-light text-zen-text-main">{metrics?.privacyScore ?? "—"}</div>
            <div className="text-[10px] text-zen-text-sub">/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column - Stats */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Pool Liquidity</div>
            <div className="text-2xl font-light text-zen-text-main">
              {((stats?.tvl || 0) / 1e9).toFixed(2)}
              <span className="text-sm text-zen-text-sub ml-1">SOL</span>
            </div>
            <div className="text-[10px] text-zen-text-sub mt-1">{stats?.totalDeposits || 0} deposits</div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Privacy Score</div>
            <div className="text-2xl font-light text-zen-text-main">
              {metrics?.privacyScore ?? "—"}<span className="text-sm text-zen-text-sub">/100</span>
            </div>
            <div className="w-full h-1 bg-zen-text-main/5 mt-3 rounded-full overflow-hidden">
              <div className="h-full bg-zen-text-main/30 rounded-full" style={{ width: `${metrics?.privacyScore ?? "—"}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-xs font-medium text-zen-text-main mb-3">Attack Surface</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Timing Attack</span>
                <span className="text-zen-text-main">High</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Amount Fingerprint</span>
                <span className="text-zen-text-main">Exposed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Graph Analysis</span>
                <span className="text-zen-text-sub">Medium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Main Visualization */}
        <div className="md:col-span-6 flex flex-col">
          <div className="flex-1 bg-white border border-zen-text-main/10 relative flex items-center justify-center p-6 rounded-xl overflow-hidden min-h-[320px]">
            <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(45,42,38,0.05)" strokeWidth="2"></circle>
                <circle 
                  cx="50" cy="50" fill="none" r="45" 
                  stroke="rgba(45,42,38,0.25)" 
                  strokeDasharray="283" 
                  strokeDashoffset={283 - (283 * (metrics?.privacyScore ?? 0)) / 100}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                ></circle>
              </svg>
              <div className="relative z-10 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-zen-text-main text-3xl mb-2">lock_open</span>
                <div className="text-4xl font-light text-zen-text-main">
                  {metrics?.privacyScore ?? "—"}
                  <span className="text-lg text-zen-text-sub">/100</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Privacy Score</div>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full text-center">
              <span className="text-[10px] text-zen-text-sub">Timing Attack Vulnerable</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">{matches.length}</div>
              <div className="text-[10px] text-zen-text-sub">Linkable TXs</div>
            </div>
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">{metrics?.avgAnonymitySet?.toFixed(1) || "1.0"}</div>
              <div className="text-[10px] text-zen-text-sub">Avg Anonymity</div>
            </div>
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">{criticalMatches}</div>
              <div className="text-[10px] text-zen-text-sub">Critical</div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Vulnerability Breakdown</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zen-text-main"></span>
                  <span className="text-zen-text-sub">Critical (1 match)</span>
                </div>
                <span className="text-zen-text-main">{criticalMatches}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zen-text-main/60"></span>
                  <span className="text-zen-text-sub">High (2-3)</span>
                </div>
                <span className="text-zen-text-main">{highMatches}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zen-text-main/30"></span>
                  <span className="text-zen-text-sub">Medium (4+)</span>
                </div>
                <span className="text-zen-text-main">{matches.length - criticalMatches - highMatches}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Attack Vectors</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">schedule</span>
                <div>
                  <div className="text-xs text-zen-text-main">Timing Attack</div>
                  <div className="text-[10px] text-zen-text-sub">Deposit-withdrawal correlation</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">fingerprint</span>
                <div>
                  <div className="text-xs text-zen-text-main">Amount Fingerprint</div>
                  <div className="text-[10px] text-zen-text-sub">Unique amounts linkable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="mt-6 bg-white border border-zen-text-main/10 rounded-xl">
        <div className="p-4 border-b border-zen-text-main/5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-zen-text-main">Linkable Transactions</div>
            <span className="text-xs text-zen-text-sub">{matches.length} found</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zen-text-sub text-lg">search</span>
            <input
              type="text"
              placeholder="Search by signature or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zen-text-main/[0.02] border border-zen-text-main/10 rounded-lg text-sm text-zen-text-main placeholder-zen-text-sub/50 focus:outline-none focus:ring-1 focus:ring-zen-indigo/20"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {matchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zen-text-main/30 mx-auto"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-xs text-zen-text-sub">No vulnerable matches found.</div>
          ) : (
            <div className="divide-y divide-zen-text-main/5">
              {matches.slice(0, 20).map((match) => (
                <div
                  key={match.withdrawal.signature}
                  className="p-4 hover:bg-zen-text-main/[0.02] cursor-pointer transition-colors"
                  onClick={() => toggleMatch(match.withdrawal.signature)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${getVulnerabilityColor(match.vulnerabilityLevel)}`}>
                        {match.vulnerabilityLevel}
                      </span>
                      <a
                        href={getSolscanLink(match.withdrawal.signature, "tx")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zen-indigo hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {truncateSig(match.withdrawal.signature)}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zen-text-main">{formatAmount(match.withdrawal.amount)}</span>
                      <span className="material-symbols-outlined text-zen-text-sub text-base transition-transform" style={{ transform: expandedMatches.has(match.withdrawal.signature) ? 'rotate(180deg)' : '' }}>
                        expand_more
                      </span>
                    </div>
                  </div>
                  
                  {expandedMatches.has(match.withdrawal.signature) && (
                    <div className="mt-3 pl-3 border-l border-zen-text-main/10 space-y-2">
                      <div className="text-xs text-zen-text-sub">
                        <span className="text-zen-text-main">Recipient:</span>{" "}
                        <a href={getSolscanLink(match.withdrawal.recipient, "address")} target="_blank" rel="noopener noreferrer" className="text-zen-indigo hover:underline">
                          {truncateSig(match.withdrawal.recipient)}
                        </a>
                      </div>
                      <div className="text-xs text-zen-text-sub">
                        <span className="text-zen-text-main">Time:</span> {formatTime(match.withdrawal.timestamp)}
                      </div>
                      <div className="text-xs text-zen-text-sub">
                        <span className="text-zen-text-main">Possible Sources ({match.possibleSources.length}):</span>
                      </div>
                      {match.possibleSources.slice(0, 3).map((source, idx) => (
                        <div key={idx} className="bg-zen-text-main/[0.02] rounded-lg p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <a href={getSolscanLink(source.deposit.signature, "tx")} target="_blank" rel="noopener noreferrer" className="text-zen-indigo hover:underline">
                              {truncateSig(source.deposit.signature)}
                            </a>
                            <span className={`${getConfidenceColor(source.confidence)}`}>
                              {(source.confidence * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <div className="text-zen-text-sub text-[10px]">
                            {formatAmount(source.deposit.amount)} • {formatTimeDelta(source.timeDeltaHours)} before
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
