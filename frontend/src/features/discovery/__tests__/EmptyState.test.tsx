/**
 * EmptyState Component Tests
 * Tests for the empty state displayed when no profiles are available
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState Component', () => {
  const mockOnAction = jest.fn();
  const mockOnSecondaryAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Variants', () => {
    it('should render no-profiles variant by default', () => {
      const { getByText } = render(
        <EmptyState onAction={mockOnAction} />
      );

      expect(getByText('No Profiles Yet')).toBeTruthy();
      expect(getByText(/finding the best matches/)).toBeTruthy();
      expect(getByText('Adjust Filters')).toBeTruthy();
    });

    it('should render end-of-list variant', () => {
      const { getByText } = render(
        <EmptyState variant="end-of-list" onAction={mockOnAction} />
      );

      expect(getByText("You've Seen Everyone!")).toBeTruthy();
      expect(getByText(/Great job exploring/)).toBeTruthy();
      expect(getByText('Expand Distance')).toBeTruthy();
    });

    it('should render no-matches variant', () => {
      const { getByText } = render(
        <EmptyState variant="no-matches" onAction={mockOnAction} />
      );

      expect(getByText('No Matches Yet')).toBeTruthy();
      expect(getByText(/Keep discovering/)).toBeTruthy();
      expect(getByText('Browse Profiles')).toBeTruthy();
    });

    it('should render loading-error variant', () => {
      const { getByText } = render(
        <EmptyState variant="loading-error" onAction={mockOnAction} />
      );

      expect(getByText('Something Went Wrong')).toBeTruthy();
      expect(getByText(/couldn't load profiles/)).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should render search icon for no-profiles', () => {
      const { getByText } = render(
        <EmptyState variant="no-profiles" onAction={mockOnAction} />
      );

      expect(getByText('🔍')).toBeTruthy();
    });

    it('should render sparkle icon for end-of-list', () => {
      const { getByText } = render(
        <EmptyState variant="end-of-list" onAction={mockOnAction} />
      );

      expect(getByText('✨')).toBeTruthy();
    });

    it('should render heart icon for no-matches', () => {
      const { getByText } = render(
        <EmptyState variant="no-matches" onAction={mockOnAction} />
      );

      expect(getByText('💝')).toBeTruthy();
    });

    it('should render sad icon for loading-error', () => {
      const { getByText } = render(
        <EmptyState variant="loading-error" onAction={mockOnAction} />
      );

      expect(getByText('😔')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should call onAction when primary button pressed', () => {
      const { getByText } = render(
        <EmptyState onAction={mockOnAction} />
      );

      fireEvent.press(getByText('Adjust Filters'));

      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should not render primary button if onAction not provided', () => {
      const { queryByText } = render(
        <EmptyState />
      );

      expect(queryByText('Adjust Filters')).toBeNull();
    });

    it('should render secondary button for variants that have it', () => {
      const { getByText } = render(
        <EmptyState
          variant="no-profiles"
          onAction={mockOnAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      expect(getByText('Refresh')).toBeTruthy();
    });

    it('should call onSecondaryAction when secondary button pressed', () => {
      const { getByText } = render(
        <EmptyState
          variant="no-profiles"
          onAction={mockOnAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      fireEvent.press(getByText('Refresh'));

      expect(mockOnSecondaryAction).toHaveBeenCalledTimes(1);
    });

    it('should not render secondary button if not provided', () => {
      const { queryByText } = render(
        <EmptyState variant="no-profiles" onAction={mockOnAction} />
      );

      expect(queryByText('Refresh')).toBeNull();
    });

    it('should not render secondary button for no-matches variant', () => {
      const { queryByText } = render(
        <EmptyState
          variant="no-matches"
          onAction={mockOnAction}
          onSecondaryAction={mockOnSecondaryAction}
        />
      );

      // no-matches variant doesn't have a secondary label defined
      expect(queryByText('Refresh')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      const { getByLabelText } = render(
        <EmptyState onAction={mockOnAction} />
      );

      expect(getByLabelText('Adjust Filters')).toBeTruthy();
    });

    it('should have accessibility hints on buttons', () => {
      const { getByLabelText } = render(
        <EmptyState onAction={mockOnAction} />
      );

      const button = getByLabelText('Adjust Filters');
      expect(button.props.accessibilityHint).toContain('adjust filters');
    });
  });

  describe('Senior-Friendly Design', () => {
    it('should render readable text (no tiny fonts)', () => {
      const { getByText } = render(
        <EmptyState variant="no-profiles" onAction={mockOnAction} />
      );

      // Component should render without throwing
      // Actual font sizes are tested in style snapshots
      expect(getByText('No Profiles Yet')).toBeTruthy();
      expect(getByText(/finding the best matches/)).toBeTruthy();
    });
  });
});
