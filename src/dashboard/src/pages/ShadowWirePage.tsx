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

const TOKEN_SYMBOLS: Record<string, string> = {
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB: "USD1",
  CzFvsLdUazabdiu9TYXujj4EY495fG7VgJJ3vQs6bonk: "BONK",
  GodL6KZ9uuUoQwELggtVzQkKmU1LfqmDokPibPeDKkhF: "GOD",
  SOL: "SOL",
};

function formatTokenAmount(token: string, amount: number, decimals: number = 9) {
  const symbol = TOKEN_SYMBOLS[token] || "UNKNOWN";
  const value = amount / Math.pow(10, decimals);
  const precision = decimals <= 5 ? 2 : decimals <= 6 ? 6 : 9;
  return { symbol, formatted: value.toFixed(precision) };
}

export function ShadowWirePage() {
  const [showAllTransfers, setShowAllTransfers] = useState(false);

  const { data: swAnalysis } = useQuery({
    queryKey: ["swAnalysis"],
    queryFn: () => loadJsonData("shadowwire-analysis.json"),
  });

  const { data: swTransfersData, isLoading: swTransfersLoading } = useQuery({
    queryKey: ["swTransfers"],
    queryFn: () => loadJsonData("shadowwire-transfers.json"),
  });

  const swTransfers = swTransfersData?.transfers || [];
  const truncateSig = (sig: string) => `${sig.slice(0, 6)}...${sig.slice(-4)}`;

  const amountsExtracted = swTransfers.filter((t: any) => t.amount && t.amount > 0).length;
  const extractionRate = swTransfers.length > 0 ? Math.round((amountsExtracted / swTransfers.length) * 100) : 0;

  return (
    <DashboardLayout title="ShadowWire" subtitle="Analysis">
      {/* Warning Banner - Glass style */}
      <div className="bg-white/50 backdrop-blur-sm border border-zen-text-main/10 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 border border-zen-text-main/10 backdrop-blur flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-zen-text-main text-xl">error_outline</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zen-text-main mb-1">Critical Vulnerability Detected</h3>
            <p className="text-xs text-zen-text-sub leading-relaxed">
              Amounts can be extracted through balance change analysis. All addresses are visible on-chain.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-light text-zen-text-main">0</div>
            <div className="text-[10px] text-zen-text-sub">/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column - Stats */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Privacy Score</div>
            <div className="text-2xl font-light text-zen-text-main">0<span className="text-sm text-zen-text-sub">/100</span></div>
            <div className="w-full h-1 bg-zen-text-main/5 mt-3 rounded-full overflow-hidden">
              <div className="h-full bg-zen-text-main/30 rounded-full w-0"></div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Address Exposure</div>
            <div className="text-2xl font-light text-zen-text-main">{swAnalysis?.addressExposureRate || 87.5}%</div>
            <div className="text-[10px] text-zen-text-sub mt-1">All addresses visible</div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mb-1">Amount Extraction</div>
            <div className="text-2xl font-light text-zen-text-main">{extractionRate}%</div>
            <div className="text-[10px] text-zen-text-sub mt-1">{amountsExtracted} of {swTransfers.length} recovered</div>
          </div>

          <div className="bg-white border border-zen-text-main/10 p-4 rounded-xl">
            <div className="text-xs font-medium text-zen-text-main mb-3">Bypass Method</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Vector</span>
                <span className="text-zen-text-main">Balance Analysis</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Formula</span>
                <span className="text-zen-text-main">post - pre</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Result</span>
                <span className="text-zen-text-main">Exposed</span>
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
                <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(45,42,38,0.25)" strokeDasharray="283" strokeDashoffset="283" strokeWidth="2" strokeLinecap="round"></circle>
              </svg>
              <div className="relative z-10 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-zen-text-main text-3xl mb-2">psychology</span>
                <div className="text-4xl font-light text-zen-text-main">0</div>
                <div className="text-[10px] uppercase tracking-wider text-zen-text-sub mt-1">Privacy Score</div>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full text-center">
              <span className="text-[10px] text-zen-text-sub">Bulletproofs Bypassed</span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-4 bg-white border border-zen-text-main/10 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zen-text-main/5">
                  <th className="text-left py-2.5 px-4 text-zen-text-sub font-medium">Feature</th>
                  <th className="text-center py-2.5 px-4 text-zen-text-sub font-medium">Claimed</th>
                  <th className="text-center py-2.5 px-4 text-zen-text-sub font-medium">Reality</th>
                </tr>
              </thead>
              <tbody className="text-zen-text-main">
                <tr className="border-b border-zen-text-main/5">
                  <td className="py-2.5 px-4">Hides Amounts</td>
                  <td className="py-2.5 px-4 text-center">Yes</td>
                  <td className="py-2.5 px-4 text-center text-zen-text-sub">No</td>
                </tr>
                <tr className="border-b border-zen-text-main/5">
                  <td className="py-2.5 px-4">Hides Addresses</td>
                  <td className="py-2.5 px-4 text-center">-</td>
                  <td className="py-2.5 px-4 text-center text-zen-text-sub">No</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">Bulletproof</td>
                  <td className="py-2.5 px-4 text-center">Yes</td>
                  <td className="py-2.5 px-4 text-center text-zen-text-sub">Bypassed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Transfer Stats</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Total</span>
                <span className="text-zen-text-main">{swAnalysis?.totalTransfers || swTransfers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Correlations</span>
                <span className="text-zen-text-main">{swAnalysis?.timingCorrelations?.uniqueLinks || 25}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zen-text-sub">Linkability</span>
                <span className="text-zen-text-main">{Math.round((swAnalysis?.linkabilityRate || 0.46) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zen-text-main/10 rounded-xl p-4">
            <div className="text-xs font-medium text-zen-text-main mb-3">Attack Vectors</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">account_balance</span>
                <div>
                  <div className="text-xs text-zen-text-main">Balance Analysis</div>
                  <div className="text-[10px] text-zen-text-sub">Extract from delta</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">visibility</span>
                <div>
                  <div className="text-xs text-zen-text-main">Address Visible</div>
                  <div className="text-[10px] text-zen-text-sub">Fully on-chain</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-zen-text-main text-base mt-0.5">schedule</span>
                <div>
                  <div className="text-xs text-zen-text-main">Timing</div>
                  <div className="text-[10px] text-zen-text-sub">Enables linking</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer List */}
      <div className="mt-6 bg-white border border-zen-text-main/10 rounded-xl">
        <div className="p-4 border-b border-zen-text-main/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zen-text-main">Extracted Transfers</div>
            <div className="text-[10px] text-zen-text-sub">Amounts recovered via balance analysis</div>
          </div>
          <button onClick={() => setShowAllTransfers(!showAllTransfers)} className="text-xs text-zen-text-sub hover:text-zen-text-main">
            {showAllTransfers ? "Less" : "All"}
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {swTransfersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zen-text-main/30 mx-auto"></div>
            </div>
          ) : swTransfers.length === 0 ? (
            <div className="text-center py-12 text-xs text-zen-text-sub">No transfers found.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-zen-text-main/[0.02] sticky top-0">
                <tr className="border-b border-zen-text-main/5">
                  <th className="text-left py-2 px-4 text-zen-text-sub font-medium">Signature</th>
                  <th className="text-left py-2 px-4 text-zen-text-sub font-medium">From</th>
                  <th className="text-left py-2 px-4 text-zen-text-sub font-medium">To</th>
                  <th className="text-right py-2 px-4 text-zen-text-sub font-medium">Amount</th>
                  <th className="text-center py-2 px-4 text-zen-text-sub font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-text-main/5">
                {(showAllTransfers ? swTransfers : swTransfers.slice(0, 10)).map((transfer: any, idx: number) => {
                  const { symbol, formatted } = transfer.amount && transfer.decimals
                    ? formatTokenAmount(transfer.token || "SOL", transfer.amount, transfer.decimals)
                    : { symbol: "?", formatted: "?" };
                  return (
                    <tr key={idx} className="hover:bg-zen-text-main/[0.02]">
                      <td className="py-2.5 px-4">
                        <a href={`https://solscan.io/tx/${transfer.signature}`} target="_blank" rel="noopener noreferrer" className="text-zen-indigo hover:underline">
                          {truncateSig(transfer.signature)}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 text-zen-text-sub">{transfer.from ? truncateSig(transfer.from) : "-"}</td>
                      <td className="py-2.5 px-4 text-zen-text-sub">{transfer.to ? truncateSig(transfer.to) : "-"}</td>
                      <td className="py-2.5 px-4 text-right text-zen-text-main">
                        {transfer.amount && transfer.amount > 0 ? `${formatted} ${symbol}` : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-[10px] ${transfer.amount && transfer.amount > 0 ? "text-zen-text-main" : "text-zen-text-sub"}`}>
                          {transfer.amount && transfer.amount > 0 ? "Exposed" : "Hidden"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
