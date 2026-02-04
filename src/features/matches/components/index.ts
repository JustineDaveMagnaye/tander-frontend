/**
 * TANDER Matches Components - PREMIUM REDESIGN
 * Export all match-related components
 *
 * This module exports the complete redesigned matches UI including:
 * - Premium header with animated stats
 * - Modern filter pill system
 * - Photo-forward match cards with expiration timers
 * - Beautiful loading, error, and empty states
 * - Profile view modals
 */

// Existing components (kept for backward compatibility)
export { MatchCard } from './MatchCard';
export type { MatchCardVariant } from './MatchCard';
export { EmptyMatchesState } from './EmptyMatchesState';
export { NewMatchesBanner } from './NewMatchesBanner';

// Premium Redesigned Components
export { MatchesHeader } from './MatchesHeader';
export { FilterTabs } from './FilterTabs';
export { MatchCardItem } from './MatchCardItem';
export { UltraPremiumMatchCard } from './UltraPremiumMatchCard';
export {
  MatchesLoadingState,
  MatchesErrorState,
  MatchesEmptyState,
} from './MatchesStates';

// Modal Components
export { ProfileViewModal } from './ProfileViewModal';
export { QuickViewModal } from './QuickViewModal';

// Utility Components
export { Shimmer } from './Shimmer';
export { ExpirationRing } from './ExpirationRing';
