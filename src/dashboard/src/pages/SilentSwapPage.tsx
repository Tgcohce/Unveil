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

export function SilentSwapPage() {
  const [showAllMatches, setShowAllMatches] = useState(false);

  const { data: ssAnalysis } = useQuery({
    queryKey: ["ssAnalysis"],
    queryFn: () => loadJsonData("silentswap-analysis.json"),
  });

  const { data: ssMatchesData, isLoading: ssMatchesLoading } = useQuery({
    queryKey: ["ssMatches"],
    queryFn: () => loadJsonData("silentswap-matches.json"),
  });

  const ssMatches = ssMatchesData?.matches || [];
  const truncateSig = (sig: string) => `${sig.slice(0, 6)}...${sig.slice(-4)}`;

  return (
    <DashboardLayout title="SilentSwap" subtitle="Analysis">
      {/* Info Banner - Glass style */}
      <div className="bg-white/50 backdrop-blur-sm border border-zen-text-main/10 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 border border-zen-text-main/10 backdrop-blur flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-zen-text-main text-xl">swap_horiz</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zen-text-main mb-1">TEE-Based Relay Protocol</h3>
            <p className="text-xs text-zen-text-sub leading-relaxed">
              Hardware isolation via TEE, but timing correlations and graph analysis reduce effective anonymity.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-light text-zen-text-main">{ssAnalysis?.privacyScore || 67}</div>
            <div className="text-[10px] text-zen-text-sub">/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column - Stats */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Privacy Score</div>
            <div className="text-2xl font-light text-zen-text-main">
              {ssAnalysis?.privacyScore || 67}<span className="text-sm text-zen-text-sub">/100</span>
            </div>
            <div className="w-full h-1 bg-zen-text-main/5 mt-3 rounded-full overflow-hidden">
              <div className="h-full bg-zen-text-main/30 rounded-full" style={{ width: `${ssAnalysis?.privacyScore || 67}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Total Inputs</div>
            <div className="text-2xl font-light text-zen-text-main">{ssAnalysis?.totalInputs || 0}</div>
            <div className="text-[10px] text-zen-text-sub mt-1">Entering relay</div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Total Outputs</div>
            <div className="text-2xl font-light text-zen-text-main">{ssAnalysis?.totalOutputs || 0}</div>
            <div className="text-[10px] text-zen-text-sub mt-1">Exiting relay</div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-xs font-medium text-zen-text-main mb-3">Architecture</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Type</span>
                <span className="text-zen-text-main">TEE Relay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Trust</span>
                <span className="text-zen-text-main">Hardware</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Weakness</span>
                <span className="text-zen-text-main">Timing</span>
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
                  strokeDashoffset={283 - (283 * (ssAnalysis?.privacyScore || 67)) / 100}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                ></circle>
              </svg>
              <div className="relative z-10 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-zen-text-main text-3xl mb-2">swap_horiz</span>
                <div className="text-4xl font-light text-zen-text-main">{ssAnalysis?.privacyScore || 67}</div>
                <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Privacy Score</div>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full text-center">
              <span className="text-[10px] text-zen-text-sub">TEE Relay Active</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">{ssMatches.length}</div>
              <div className="text-[10px] text-zen-text-sub">Matched</div>
            </div>
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">{ssAnalysis?.avgAnonymitySet?.toFixed(1) || "1.8"}</div>
              <div className="text-[10px] text-zen-text-sub">Anonymity</div>
            </div>
            <div className="bg-white border border-zen-text-main/10 p-3 rounded-xl text-center">
              <div className="text-xl font-light text-zen-text-main">
                {ssAnalysis?.linkabilityRate ? `${Math.round(ssAnalysis.linkabilityRate * 100)}%` : "10%"}
              </div>
              <div className="text-[10px] text-zen-text-sub">Linkability</div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Analysis Summary</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Hides Addresses</span>
                <span className="text-zen-text-main">Partial</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Hides Amounts</span>
                <span className="text-zen-text-sub">No</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Timing Resistance</span>
                <span className="text-zen-text-sub">Low</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Vulnerabilities</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">schedule</span>
                <div>
                  <div className="text-xs text-zen-text-main">Timing</div>
                  <div className="text-[10px] text-zen-text-sub">Pattern matching</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">hub</span>
                <div>
                  <div className="text-xs text-zen-text-main">Graph</div>
                  <div className="text-[10px] text-zen-text-sub">Reveals links</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">payments</span>
                <div>
                  <div className="text-xs text-zen-text-main">Amounts</div>
                  <div className="text-[10px] text-zen-text-sub">Visible on-chain</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm border border-zen-text-main/10 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-zen-text-sub text-sm mt-0.5">info</span>
              <p className="text-[10px] text-zen-text-sub leading-relaxed">
                TEE provides hardware isolation but does not prevent metadata analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Matched Pairs List */}
      <div className="mt-6 bg-white border border-zen-text-main/10 rounded-xl">
        <div className="p-4 border-b border-zen-text-main/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zen-text-main">Correlated Pairs</div>
            <div className="text-[10px] text-zen-text-sub">Linked through timing analysis</div>
          </div>
          <button onClick={() => setShowAllMatches(!showAllMatches)} className="text-xs text-zen-text-sub hover:text-zen-text-main">
            {showAllMatches ? "Less" : "All"}
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {ssMatchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zen-text-main/30 mx-auto"></div>
            </div>
          ) : ssMatches.length === 0 ? (
            <div className="text-center py-12 text-xs text-zen-text-sub">No correlated pairs found.</div>
          ) : (
            <div className="divide-y divide-zen-text-main/5">
              {(showAllMatches ? ssMatches : ssMatches.slice(0, 10)).map((match: any, idx: number) => (
                <div key={idx} className="p-4 hover:bg-zen-text-main/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zen-text-main">{(match.confidence * 100).toFixed(0)}% match</span>
                      <span className="text-[10px] text-zen-text-sub">Δ {match.timeDeltaHours?.toFixed(1) || "?"}h</span>
                    </div>
                    <span className="text-xs text-zen-text-main">
                      {match.amount ? `${(match.amount / 1e9).toFixed(4)} SOL` : "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-zen-text-sub mb-0.5">Input</div>
                      <a href={`https://solscan.io/tx/${match.input?.signature}`} target="_blank" rel="noopener noreferrer" className="text-zen-indigo hover:underline">
                        {match.input?.signature ? truncateSig(match.input.signature) : "-"}
                      </a>
                    </div>
                    <div>
                      <div className="text-[10px] text-zen-text-sub mb-0.5">Output</div>
                      <a href={`https://solscan.io/tx/${match.output?.signature}`} target="_blank" rel="noopener noreferrer" className="text-zen-indigo hover:underline">
                        {match.output?.signature ? truncateSig(match.output.signature) : "-"}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
