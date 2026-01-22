import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PrivacyAdvisor() {
  const [amount, setAmount] = useState('1');
  const [delayHours, setDelayHours] = useState('24');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/advisor`, {
        amount: parseFloat(amount) * 1e9, // Convert SOL to lamports
        delayHours: parseInt(delayHours),
      });
      setResult(res.data);
    } catch (error) {
      console.error('Error getting advice:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (score: number) => {
    if (score < 10) return 'text-red-400';
    if (score < 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Privacy Advisor</h3>
        <p className="text-sm text-slate-400">Estimate your anonymity set</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Deposit Amount (SOL)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="1.0"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Delay Before Withdrawal (hours)
          </label>
          <input
            type="number"
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="24"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Privacy'}
        </button>
      </div>

      {result && (
        <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Estimated Anonymity Set</div>
            <div className={`text-3xl font-bold ${getRecommendationColor(result.estimatedAnonymitySet)}`}>
              {result.estimatedAnonymitySet}
            </div>
            <div className="text-slate-300 text-sm mt-2">
              {result.recommendation}
            </div>
          </div>

          {result.betterAmounts && result.betterAmounts.length > 0 && (
            <div>
              <div className="text-slate-400 text-sm mb-2">Better amounts:</div>
              <div className="flex gap-2 flex-wrap">
                {result.betterAmounts.map((amt: number) => (
                  <span
                    key={amt}
                    className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-sm text-purple-300"
                  >
                    {(amt / 1e9).toFixed(3)} SOL
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.betterTiming && (
            <div className="text-sm text-slate-300 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <span className="text-blue-400 font-semibold">Timing Tip:</span> {result.betterTiming}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-400">Avg Set</div>
              <div className="text-white font-semibold">
                {result.currentMetrics?.avgAnonymitySet?.toFixed(0) || 0}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-400">Active</div>
              <div className="text-white font-semibold">
                {result.currentMetrics?.activeDeposits || 0}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded p-2">
              <div className="text-slate-400">24h</div>
              <div className="text-white font-semibold">
                {result.currentMetrics?.recentActivity || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
