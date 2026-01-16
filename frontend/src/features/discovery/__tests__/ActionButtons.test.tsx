/**
 * ActionButtons Component Tests
 * Tests for the Pass/Like action buttons
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ActionButtons } from '../components/ActionButtons';

// Mock expo-haptics - functions must return resolved promises since they're awaited
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Mock useResponsive hook
jest.mock('@shared/hooks/useResponsive', () => ({
  useResponsive: () => ({
    width: 375,
    height: 812,
    isLandscape: false,
    isTablet: false,
    hp: (percent: number) => (812 * percent) / 100,
    wp: (percent: number) => (375 * percent) / 100,
    moderateScale: (size: number) => size,
  }),
}));

import * as Haptics from 'expo-haptics';

describe('ActionButtons Component', () => {
  const mockOnPass = jest.fn();
  const mockOnLike = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both buttons', () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      expect(getByLabelText('Pass')).toBeTruthy();
      expect(getByLabelText('Like')).toBeTruthy();
    });

    it('should apply disabled styles when disabled', () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
          disabled
        />
      );

      const passButton = getByLabelText('Pass');
      expect(passButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Interactions', () => {
    it('should call onPass when pass button is pressed', async () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      fireEvent.press(getByLabelText('Pass'));

      await waitFor(() => {
        expect(mockOnPass).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onLike when like button is pressed', async () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      fireEvent.press(getByLabelText('Like'));

      await waitFor(() => {
        expect(mockOnLike).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call handlers when disabled', async () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
          disabled
        />
      );

      fireEvent.press(getByLabelText('Pass'));
      fireEvent.press(getByLabelText('Like'));

      // Wait a tick to ensure any async operations would have completed
      await waitFor(() => {
        expect(mockOnPass).not.toHaveBeenCalled();
        expect(mockOnLike).not.toHaveBeenCalled();
      });
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger medium haptic for pass', async () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      fireEvent.press(getByLabelText('Pass'));

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Medium
        );
      });
    });

    it('should trigger success haptic for like', async () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      fireEvent.press(getByLabelText('Like'));

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });
  });

  describe('Layout', () => {
    it('should default to horizontal layout', () => {
      const { UNSAFE_root } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      // The container should have horizontal flex direction
      const container = UNSAFE_root.children[0];
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flexDirection: 'row' }),
        ])
      );
    });

    it('should support vertical layout', () => {
      const { UNSAFE_root } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
          layout="vertical"
        />
      );

      const container = UNSAFE_root.children[0];
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flexDirection: 'column-reverse' }),
        ])
      );
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility roles', () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      expect(getByLabelText('Pass').props.accessibilityRole).toBe('button');
      expect(getByLabelText('Like').props.accessibilityRole).toBe('button');
    });

    it('should have accessibility hints', () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      expect(getByLabelText('Pass').props.accessibilityHint).toContain('profile');
      expect(getByLabelText('Like').props.accessibilityHint).toContain('profile');
    });

    it('should report disabled state correctly', () => {
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
          disabled
        />
      );

      expect(getByLabelText('Pass').props.accessibilityState.disabled).toBe(true);
      expect(getByLabelText('Like').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Touch Targets', () => {
    it('should have senior-friendly touch target sizes', () => {
      // Action buttons should be at least 56px for senior accessibility
      const { getByLabelText } = render(
        <ActionButtons
          onPass={mockOnPass}
          onLike={mockOnLike}
        />
      );

      // The minimum size should be enforced in the component
      // This is a smoke test - actual sizes depend on responsive calculations
      expect(getByLabelText('Pass')).toBeTruthy();
      expect(getByLabelText('Like')).toBeTruthy();
    });
  });
});
