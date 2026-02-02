/**
 * Privacy Tier System
 * Replaces harsh numeric scores with professional tier badges
 */

export interface PrivacyTier {
  name: 'Strong' | 'Moderate' | 'Limited' | 'Minimal';
  label: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  icon: string;
  scoreRange: { min: number; max: number };
}

const TIERS: Record<string, PrivacyTier> = {
  strong: {
    name: 'Strong',
    label: 'Strong',
    description: 'Robust privacy protection',
    color: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-600',
      border: 'border-emerald-500/30',
    },
    icon: 'verified_user',
    scoreRange: { min: 75, max: 100 },
  },
  moderate: {
    name: 'Moderate',
    label: 'Moderate',
    description: 'Reasonable privacy with some patterns',
    color: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-600',
      border: 'border-blue-500/30',
    },
    icon: 'shield',
    scoreRange: { min: 50, max: 74 },
  },
  limited: {
    name: 'Limited',
    label: 'Limited',
    description: 'Privacy present but weaknesses exist',
    color: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-600',
      border: 'border-amber-500/30',
    },
    icon: 'shield_with_heart',
    scoreRange: { min: 25, max: 49 },
  },
  minimal: {
    name: 'Minimal',
    label: 'Minimal',
    description: 'Substantial exposure risks',
    color: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-600',
      border: 'border-orange-500/30',
    },
    icon: 'warning',
    scoreRange: { min: 0, max: 24 },
  },
};

/**
 * Get privacy tier based on score (0-100)
 */
export function getPrivacyTier(score: number): PrivacyTier {
  if (score >= 75) return TIERS.strong;
  if (score >= 50) return TIERS.moderate;
  if (score >= 25) return TIERS.limited;
  return TIERS.minimal;
}

/**
 * Get timing resistance tier based on entropy and median delay
 * Higher entropy + longer delays = better timing resistance
 */
export interface TimingResistanceTier {
  level: 'High' | 'Medium' | 'Low';
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

export function getTimingResistanceTier(
  entropy: number,
  medianDelayMs: number
): TimingResistanceTier {
  // Convert delay to hours
  const delayHours = medianDelayMs / (1000 * 60 * 60);

  // High: entropy > 2 AND delay > 24h
  // Medium: entropy > 1 AND delay > 1h
  // Low: everything else

  if (entropy > 2 && delayHours > 24) {
    return {
      level: 'High',
      label: 'HIGH',
      color: {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-600',
        border: 'border-emerald-500/30',
      },
    };
  }

  if (entropy > 1 && delayHours > 1) {
    return {
      level: 'Medium',
      label: 'MED',
      color: {
        bg: 'bg-amber-500/15',
        text: 'text-amber-600',
        border: 'border-amber-500/30',
      },
    };
  }

  return {
    level: 'Low',
    label: 'LOW',
    color: {
      bg: 'bg-red-500/15',
      text: 'text-red-500',
      border: 'border-red-500/30',
    },
  };
}

/**
 * Format linkability rate consistently
 * Expects decimal (0-1), returns percentage string
 */
export function formatLinkability(rate: number): string {
  // Handle both decimal (0.18) and percentage (18, 91.25) formats
  const normalized = rate > 1 ? rate / 100 : rate;
  return `${Math.round(normalized * 100)}%`;
}

/**
 * Normalize linkability rate to decimal (0-1)
 */
export function normalizeLinkabilityRate(rate: number): number {
  // If rate > 1, it's already a percentage, convert to decimal
  return rate > 1 ? rate / 100 : rate;
}

/**
 * Normalize confidence score to decimal (0-1)
 */
export function normalizeConfidence(confidence: number): number {
  // If confidence > 1, it's a percentage, convert to decimal
  return confidence > 1 ? confidence / 100 : confidence;
}
