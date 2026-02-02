import { getPrivacyTier, type PrivacyTier } from '../utils/privacyTiers';

interface PrivacyTierBadgeProps {
  score: number;
  showScore?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Displays a professional privacy tier badge
 * Replaces harsh numeric scores with tier labels
 */
export function PrivacyTierBadge({
  score,
  showScore = false,
  showIcon = false,
  size = 'sm',
}: PrivacyTierBadgeProps) {
  const tier = getPrivacyTier(score);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${tier.color.bg} ${tier.color.text} ${tier.color.border} border ${sizeClasses[size]}`}
      title={tier.description}
    >
      {showIcon && (
        <span className="material-symbols-outlined text-[inherit]" style={{ fontSize: 'inherit' }}>
          {tier.icon}
        </span>
      )}
      <span>{tier.label}</span>
      {showScore && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );
}

interface TierDisplayProps {
  tier: PrivacyTier;
  showDescription?: boolean;
}

/**
 * Full tier display with description
 */
export function TierDisplay({ tier, showDescription = true }: TierDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-xs px-3 py-1 ${tier.color.bg} ${tier.color.text} ${tier.color.border} border`}
      >
        <span className="material-symbols-outlined text-sm">{tier.icon}</span>
        <span>{tier.label}</span>
      </span>
      {showDescription && (
        <span className="text-xs text-zen-text-sub">{tier.description}</span>
      )}
    </div>
  );
}
