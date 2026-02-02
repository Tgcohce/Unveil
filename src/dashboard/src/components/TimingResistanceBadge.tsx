import { getTimingResistanceTier } from '../utils/privacyTiers';

interface TimingResistanceBadgeProps {
  entropy: number;
  medianDelayMs: number;
}

/**
 * Dynamic timing resistance badge
 * Calculates tier from entropy and median delay
 */
export function TimingResistanceBadge({
  entropy,
  medianDelayMs,
}: TimingResistanceBadgeProps) {
  const tier = getTimingResistanceTier(entropy, medianDelayMs);

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${tier.color.bg} ${tier.color.text} ${tier.color.border} border`}
      title={`Entropy: ${entropy.toFixed(2)}, Median Delay: ${(medianDelayMs / (1000 * 60 * 60)).toFixed(1)}h`}
    >
      {tier.label}
    </span>
  );
}

interface StaticTimingBadgeProps {
  level: 'High' | 'Medium' | 'Low';
}

/**
 * Static timing badge when metrics aren't available
 */
export function StaticTimingBadge({ level }: StaticTimingBadgeProps) {
  const colors = {
    High: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-600',
      border: 'border-emerald-500/30',
    },
    Medium: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-600',
      border: 'border-amber-500/30',
    },
    Low: {
      bg: 'bg-red-500/15',
      text: 'text-red-500',
      border: 'border-red-500/30',
    },
  };

  const labels = {
    High: 'HIGH',
    Medium: 'MED',
    Low: 'LOW',
  };

  const color = colors[level];

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${color.bg} ${color.text} ${color.border} border`}
    >
      {labels[level]}
    </span>
  );
}
