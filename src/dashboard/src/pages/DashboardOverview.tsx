import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";

const loadJsonData = async (filename: string) => {
  const response = await fetch(`/data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }
  return response.json();
};

export function DashboardOverview() {
  const { data: comparison } = useQuery({
    queryKey: ["compare"],
    queryFn: () => loadJsonData("comparison.json"),
  });

  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => loadJsonData("metrics.json"),
  });

  const { data: swAnalysis } = useQuery({
    queryKey: ["swAnalysis"],
    queryFn: () => loadJsonData("shadowwire-analysis.json"),
  });

  const { data: ssAnalysis } = useQuery({
    queryKey: ["ssAnalysis"],
    queryFn: () => loadJsonData("silentswap-analysis.json"),
  });

  const { data: matchData } = useQuery({
    queryKey: ["matches"],
    queryFn: () => loadJsonData("matches.json"),
  });

  const allMatches = matchData?.matches || [];

  return (
    <DashboardLayout title="Privacy" subtitle="Measurement">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl md:text-5xl font-light text-zen-text-main leading-tight mb-6 tracking-tight">
          Privacy <span className="text-zen-indigo/70 font-extralight">Measurement</span>
        </h2>
        <p className="text-base text-zen-text-sub leading-relaxed max-w-2xl mx-auto">
          Quantifying anonymity through on-chain analysis. We measure digital fingerprints, 
          timing correlations, and transaction patterns to benchmark privacy guarantees.
        </p>
      </div>

      {/* Three Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {/* The Promise */}
        <div className="bg-white border border-zen-text-main/10 rounded-xl p-8 flex flex-col relative overflow-hidden group hover:border-zen-indigo/20 transition-all">
          <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-zen-text-main">savings</span>
          </div>
          <h3 className="text-xl font-medium text-zen-text-main mb-3 group-hover:text-zen-indigo transition-colors">
            The Promise
          </h3>
          <p className="text-sm text-zen-text-sub leading-relaxed mb-6 flex-grow">
            A communal pool where users deposit assets. Once mixed, the origin of any single 
            withdrawal should theoretically remain indistinguishable.
          </p>
          <div className="pt-4 border-t border-zen-text-main/5">
            <span className="text-xs uppercase tracking-wider text-zen-text-sub flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Deposits accepted
            </span>
          </div>
        </div>

        {/* The Reality */}
        <div className="bg-white border border-zen-text-main/10 rounded-xl p-8 flex flex-col relative overflow-hidden group hover:border-zen-indigo/20 transition-all">
          <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-zen-text-main">visibility</span>
          </div>
          <h3 className="text-xl font-medium text-zen-text-main mb-3 group-hover:text-zen-indigo transition-colors">
            The Reality
          </h3>
          <p className="text-sm text-zen-text-sub leading-relaxed mb-6 flex-grow">
            Unique amounts and specific timing create patterns. If 10.5 SOL enters and 10.4 SOL 
            exits minutes later, the link is visible.
          </p>
          <div className="pt-4 border-t border-zen-text-main/5">
            <span className="text-xs uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              Correlation detected
            </span>
          </div>
        </div>

        {/* Unveil's Analysis */}
        <div className="bg-white border border-zen-text-main/10 rounded-xl p-8 flex flex-col relative overflow-hidden group hover:border-zen-indigo/20 transition-all">
          <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-5xl text-zen-text-main">fingerprint</span>
          </div>
          <h3 className="text-xl font-medium text-zen-text-main mb-3 group-hover:text-zen-indigo transition-colors">
            Unveil's Analysis
          </h3>
          <p className="text-sm text-zen-text-sub leading-relaxed mb-6 flex-grow">
            We mathematically prove these links by analyzing <strong className="text-zen-indigo">Amount</strong> consistency, 
            <strong className="text-zen-indigo"> Timing</strong> proximity, and <strong className="text-zen-indigo">Graph</strong> heuristics.
          </p>
          <div className="pt-4 border-t border-zen-text-main/5">
            <span className="text-xs uppercase tracking-wider text-zen-text-sub flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">analytics</span>
              Heuristics applied
            </span>
          </div>
        </div>
      </div>

      {/* Protocol Comparison Table */}
      <div className="bg-white border border-zen-text-main/10 rounded-xl overflow-hidden mb-16">
        <div className="p-6 border-b border-zen-text-main/5 flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-zen-text-main">compare</span>
          <div>
            <h3 className="text-lg font-medium text-zen-text-main">Protocol Comparison</h3>
            <p className="text-xs text-zen-text-sub">Real mainnet data, January 2026</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zen-text-main/10 bg-zen-text-main/[0.02]">
                <th className="text-left py-4 px-6 text-zen-text-sub font-medium">Protocol</th>
                <th className="text-left py-4 px-6 text-zen-text-sub font-medium">Architecture</th>
                <th className="text-right py-4 px-6 text-zen-text-sub font-medium">Transactions</th>
                <th className="text-right py-4 px-6 text-zen-text-sub font-medium">Avg Anonymity Set</th>
                <th className="text-right py-4 px-6 text-zen-text-sub font-medium">Linkability</th>
                <th className="text-center py-4 px-6 text-zen-text-sub font-medium">Timing Resistance</th>
              </tr>
            </thead>
            <tbody>
              {/* Privacy Cash */}
              <tr className="border-b border-zen-text-main/5 hover:bg-zen-text-main/[0.02] transition-colors">
                <td className="py-4 px-6">
                  <Link to="/dashboard/privacy-cash" className="flex items-center gap-2 group">
                    <span className="font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors">Privacy Cash</span>
                  </Link>
                </td>
                <td className="py-4 px-6 text-zen-text-sub">ZK Pool</td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {(comparison?.privacyCash?.totalDeposits || 0) + (comparison?.privacyCash?.totalWithdrawals || 0)}
                </td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {metrics?.avgAnonymitySet?.toFixed(1) || "1.0"}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-red-600 font-medium">
                    {allMatches.length > 0
                      ? `${Math.round((allMatches.filter((m: any) => m.anonymitySet === 1).length / allMatches.length) * 100)}%`
                      : "68%"}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    LOW
                  </span>
                </td>
              </tr>

              {/* SilentSwap */}
              <tr className="border-b border-zen-text-main/5 hover:bg-zen-text-main/[0.02] transition-colors">
                <td className="py-4 px-6">
                  <Link to="/dashboard/silentswap" className="flex items-center gap-2 group">
                    <span className="font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors">SilentSwap</span>
                  </Link>
                </td>
                <td className="py-4 px-6 text-zen-text-sub">TEE Relay</td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {(ssAnalysis?.totalInputs || 0) + (ssAnalysis?.totalOutputs || 0)}
                </td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {ssAnalysis?.avgAnonymitySet?.toFixed(1) || "1.8"}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-orange-600 font-medium">
                    {ssAnalysis?.linkabilityRate ? `${Math.round(ssAnalysis.linkabilityRate * 100)}%` : "18%"}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                    LOW
                  </span>
                </td>
              </tr>

              {/* ShadowWire */}
              <tr className="border-b border-zen-text-main/5 hover:bg-zen-text-main/[0.02] transition-colors">
                <td className="py-4 px-6">
                  <Link to="/dashboard/shadowwire" className="flex items-center gap-2 group">
                    <span className="font-medium text-zen-text-main group-hover:text-zen-indigo transition-colors">ShadowWire</span>
                  </Link>
                </td>
                <td className="py-4 px-6 text-zen-text-sub">Bulletproofs</td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {swAnalysis?.totalTransfers || 80}
                </td>
                <td className="py-4 px-6 text-right text-zen-text-sub">
                  {swAnalysis?.avgAnonymitySet?.toFixed(1) || "2.1"}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-red-600 font-medium">
                    {swAnalysis?.linkabilityRate ? `${Math.round(swAnalysis.linkabilityRate)}%` : "91%"}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    LOW
                  </span>
                </td>
              </tr>

              {/* Confidential Transfers */}
              <tr className="hover:bg-zen-text-main/[0.02] transition-colors opacity-50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zen-text-sub">Confidential Transfers</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zen-text-main/10 text-zen-text-sub">
                      Coming Soon
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-zen-text-sub/70">SPL Extension</td>
                <td className="py-4 px-6 text-right text-zen-text-sub/70">0</td>
                <td className="py-4 px-6 text-right text-zen-text-sub/70">-</td>
                <td className="py-4 px-6 text-right text-zen-text-sub/70">-</td>
                <td className="py-4 px-6 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-zen-text-main/5 text-zen-text-sub/70">
                    N/A
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-zen-text-main/5 flex items-center justify-between text-xs text-zen-text-sub">
          <span>Methodology: Deposit-withdrawal timing correlation analysis</span>
          <a href="#" className="text-zen-indigo hover:underline flex items-center gap-1">
            Learn more
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/dashboard/privacy-cash"
          className="bg-white border border-zen-text-main/10 rounded-xl p-6 hover:border-zen-indigo/30 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">lock_open</span>
            <span className="text-2xl font-light text-red-600">{comparison?.privacyCash?.privacyScore || 16}/100</span>
          </div>
          <h4 className="text-lg font-medium text-zen-text-main mb-1 group-hover:text-zen-indigo transition-colors">Privacy Cash</h4>
          <p className="text-sm text-zen-text-sub">ZK Mixing Protocol · Timing Attack Vulnerable</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-zen-indigo opacity-0 group-hover:opacity-100 transition-opacity">
            View Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>

        <Link 
          to="/dashboard/shadowwire"
          className="bg-white border border-zen-text-main/10 rounded-xl p-6 hover:border-zen-indigo/30 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">psychology</span>
            <span className="text-2xl font-light text-red-600">{swAnalysis?.privacyScore || 0}/100</span>
          </div>
          <h4 className="text-lg font-medium text-zen-text-main mb-1 group-hover:text-zen-indigo transition-colors">ShadowWire</h4>
          <p className="text-sm text-zen-text-sub">Bulletproof ZK · Amount Correlation Broken</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-zen-indigo opacity-0 group-hover:opacity-100 transition-opacity">
            View Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>

        <Link 
          to="/dashboard/silentswap"
          className="bg-white border border-zen-text-main/10 rounded-xl p-6 hover:border-zen-indigo/30 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-2xl text-zen-text-main group-hover:text-zen-indigo transition-colors">swap_horiz</span>
            <span className="text-2xl font-light text-orange-600">{ssAnalysis?.privacyScore || 18}/100</span>
          </div>
          <h4 className="text-lg font-medium text-zen-text-main mb-1 group-hover:text-zen-indigo transition-colors">SilentSwap</h4>
          <p className="text-sm text-zen-text-sub">TEE Relay · Graph Analysis Possible</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-zen-indigo opacity-0 group-hover:opacity-100 transition-opacity">
            View Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}
