/**
 * TANDER Match Expiration Timer Hook
 * Bumble-inspired 24-hour countdown timer for matches
 *
 * Features:
 * - Real-time countdown updating every minute (not second) to reduce re-renders
 * - Visual percentage for progress indication
 * - Urgency states (expiring soon, critical)
 * - Memory-efficient with cleanup on unmount
 * - Only updates when display text would change
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ExpirationTime, Match } from '../types';

const TOTAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const EXPIRING_SOON_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours
const CRITICAL_THRESHOLD = 1 * 60 * 60 * 1000; // 1 hour

/**
 * Calculate expiration time details from a match
 * Handles invalid dates gracefully
 */
export const calculateExpirationTime = (match: Match): ExpirationTime => {
  const now = new Date().getTime();
  const expiresAtDate = new Date(match.expiresAt);
  const matchedAtDate = new Date(match.matchedAt);

  // Validate dates - return expired state for invalid dates
  if (isNaN(expiresAtDate.getTime()) || isNaN(matchedAtDate.getTime())) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      percentage: 0,
      isExpired: true,
      isExpiringSoon: false,
      isCritical: false,
      displayText: 'Invalid',
    };
  }

  const expiresAt = expiresAtDate.getTime();
  const matchedAt = matchedAtDate.getTime();

  const remainingMs = Math.max(0, expiresAt - now);
  const totalDuration = expiresAt - matchedAt;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  // Calculate percentage for progress ring (0-100)
  const percentage = totalDuration > 0
    ? Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100))
    : 0;

  const isExpired = remainingMs <= 0;
  const isExpiringSoon = !isExpired && remainingMs <= EXPIRING_SOON_THRESHOLD;
  const isCritical = !isExpired && remainingMs <= CRITICAL_THRESHOLD;

  // Format display text - only show hours and minutes to reduce updates
  let displayText = '';
  if (isExpired) {
    displayText = 'Expired';
  } else if (hours > 0) {
    displayText = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    displayText = `${minutes}m`;
  } else {
    displayText = '<1m';
  }

  return {
    hours,
    minutes,
    seconds,
    percentage,
    isExpired,
    isExpiringSoon,
    isCritical,
    displayText,
  };
};

/**
 * Hook to get real-time expiration countdown for a match
 * Updates every minute to reduce re-renders
 *
 * @param match - The match to track expiration for
 * @param enabled - Whether to enable the timer (default: true)
 * @returns ExpirationTime object with countdown details
 */
export const useExpirationTimer = (
  match: Match | null,
  enabled: boolean = true
): ExpirationTime | null => {
  const [expirationTime, setExpirationTime] = useState<ExpirationTime | null>(
    match && enabled ? calculateExpirationTime(match) : null
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDisplayTextRef = useRef<string>('');

  const updateTime = useCallback(() => {
    if (match) {
      const newTime = calculateExpirationTime(match);
      // Only update state if display text changed to reduce re-renders
      if (newTime.displayText !== lastDisplayTextRef.current) {
        lastDisplayTextRef.current = newTime.displayText;
        setExpirationTime(newTime);
      }
    }
  }, [match]);

  useEffect(() => {
    if (!match || !enabled) {
      setExpirationTime(null);
      return;
    }

    // Initial calculation
    const initial = calculateExpirationTime(match);
    lastDisplayTextRef.current = initial.displayText;
    setExpirationTime(initial);

    // If match has first message, no need for timer
    if (match.hasFirstMessage) {
      return;
    }

    // Update every 30 seconds instead of every second
    intervalRef.current = setInterval(updateTime, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [match, enabled, updateTime]);

  return expirationTime;
};

/**
 * Hook to get expiration times for multiple matches
 * Optimized to only update when display values change
 *
 * @param matches - Array of matches to track
 * @param enabled - Whether to enable timers
 * @returns Map of match ID to ExpirationTime
 */
export const useMultipleExpirationTimers = (
  matches: Match[],
  enabled: boolean = true
): Map<string, ExpirationTime> => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDisplayTextsRef = useRef<Map<string, string>>(new Map());

  // Calculate times using useMemo to avoid recalculation on every render
  const expirationTimes = useMemo(() => {
    const times = new Map<string, ExpirationTime>();
    if (!enabled) return times;

    matches.forEach((match) => {
      // Only track matches without first message
      if (!match.hasFirstMessage) {
        times.set(match.id, calculateExpirationTime(match));
      }
    });
    return times;
  }, [matches, enabled, updateTrigger]);

  useEffect(() => {
    if (!enabled || matches.length === 0) {
      return;
    }

    // Check if any display text changed
    const checkForUpdates = () => {
      let needsUpdate = false;
      matches.forEach((match) => {
        if (!match.hasFirstMessage) {
          const newTime = calculateExpirationTime(match);
          const lastText = lastDisplayTextsRef.current.get(match.id);
          if (newTime.displayText !== lastText) {
            lastDisplayTextsRef.current.set(match.id, newTime.displayText);
            needsUpdate = true;
          }
        }
      });

      if (needsUpdate) {
        setUpdateTrigger((prev) => prev + 1);
      }
    };

    // Initial setup
    matches.forEach((match) => {
      if (!match.hasFirstMessage) {
        const time = calculateExpirationTime(match);
        lastDisplayTextsRef.current.set(match.id, time.displayText);
      }
    });

    // Update every 30 seconds instead of every second
    intervalRef.current = setInterval(checkForUpdates, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [matches, enabled]);

  return expirationTimes;
};

/**
 * Create a match object with 24-hour expiration from current time
 * Utility for creating mock data or new matches
 */
export const createMatchWithExpiration = (
  matchData: Omit<Match, 'expiresAt' | 'hasFirstMessage'>,
  hoursRemaining: number = 24
): Match => {
  const matchedAt = new Date(matchData.matchedAt);
  const expiresAt = new Date(matchedAt.getTime() + TOTAL_DURATION_MS);

  // If hoursRemaining is less than 24, adjust the matchedAt to simulate time passing
  if (hoursRemaining < 24) {
    const hoursElapsed = 24 - hoursRemaining;
    matchedAt.setTime(matchedAt.getTime() - hoursElapsed * 60 * 60 * 1000);
  }

  return {
    ...matchData,
    expiresAt,
    hasFirstMessage: false,
  };
};

export default useExpirationTimer;
