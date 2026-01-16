/**
 * TANDER Matches Hooks
 * Export all hooks for the matches feature
 */

export {
  useExpirationTimer,
  useMultipleExpirationTimers,
  calculateExpirationTime,
  createMatchWithExpiration,
  extendMatch,
} from './useExpirationTimer';

export {
  useMatches,
  useCategorizedMatches,
  useNewMatches,
  useInboxMatches,
  useMatchStats,
  useSwipe,
  useUnmatch,
  useFilteredMatches,
  matchesQueryKeys,
  transformMatchDTO,
  transformMatchDTOs,
} from './useMatches';

export {
  useMatchesResponsive,
} from './useMatchesResponsive';
export type {
  MatchesFontSizes,
  MatchesSpacing,
  CardDimensions,
  UseMatchesResponsiveReturn,
} from './useMatchesResponsive';
