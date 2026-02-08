import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function TransactionFeed() {
  const { status: wsStatus, recentEvents } = useWebSocket();

  // When WS is connected, disable polling (WS invalidates queries on new data)
  // When disconnected, fall back to 10s polling
  const refetchInterval = wsStatus === 'connected' ? false as const : 10000;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/transactions?limit=10`);
      return res.data;
    },
    refetchInterval,
  });

  // Merge WS events with API data for instant display before refetch settles
  const wsTransactions = recentEvents
    .filter((e) => e.channel === 'transactions')
    .slice(0, 3)
    .map((e) => e.data);

  // Combine: WS events first (new), then API data, deduplicated by signature
  const seenSigs = new Set<string>();
  const allTransactions: any[] = [];
  for (const tx of [...wsTransactions, ...(data?.transactions || [])]) {
    if (tx?.signature && !seenSigs.has(tx.signature)) {
      seenSigs.add(tx.signature);
      allTransactions.push(tx);
    }
  }

  const formatAmount = (lamports: number) => {
    return (lamports / 1e9).toFixed(3) + ' SOL';
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const truncateSignature = (sig: string) => {
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          {wsStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">Latest deposits and withdrawals</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {allTransactions.map((tx: any) => (
            <div
              key={tx.signature}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    tx.type === 'deposit' ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                />
                <div>
                  <div className="text-white text-sm font-mono">
                    {truncateSignature(tx.signature)}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">{formatAmount(tx.amount)}</div>
                <div className="text-slate-400 text-xs">{formatTime(tx.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400 text-center">
          Total: {data?.total?.toLocaleString() || 0} transactions
        </div>
      </div>
    </div>
  );
}
