interface MetricsCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function MetricsCard({ title, value, subtitle, trend = 'neutral' }: MetricsCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 transition-colors">
      <div className="text-slate-400 text-sm mb-2">{title}</div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className={`text-sm ${trendColors[trend]} flex items-center gap-1`}>
        <span>{trendIcons[trend]}</span>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
