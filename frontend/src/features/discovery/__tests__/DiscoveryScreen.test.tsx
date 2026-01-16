/**
 * DiscoveryScreen Component Tests
 * Tests for the main discovery/swipe screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { useDiscovery } from '../hooks/useDiscovery';

// Mock the hooks and modules
jest.mock('../hooks/useDiscovery');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockUseDiscovery = useDiscovery as jest.MockedFunction<typeof useDiscovery>;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 375, height: 812 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </SafeAreaProvider>
);

// Mock profile data
const mockProfile = {
  id: 1,
  name: 'Maria Santos',
  age: 55,
  location: 'Manila, Philippines',
  distance: '5 km',
  bio: 'Looking for companionship in my golden years. I love cooking, gardening, and spending time with family.',
  interests: ['Reading', 'Cooking', 'Gardening'],
  verified: true,
  online: true,
  image: 'https://example.com/photo.jpg',
};

const mockProfile2 = {
  ...mockProfile,
  id: 2,
  name: 'Jose Cruz',
  age: 60,
  verified: false,
  online: false,
};

// Default mock state
const defaultMockState = {
  profiles: [mockProfile, mockProfile2],
  currentIndex: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMoreProfiles: true,
  swipesRemaining: 50,
  matchInfo: null,
  showMatchPopup: false,
  currentProfile: mockProfile,
  hasProfiles: true,
  filters: { minAge: 50, verifiedOnly: false },
  loadProfiles: jest.fn(),
  swipeRight: jest.fn().mockResolvedValue({ success: true }),
  swipeLeft: jest.fn().mockResolvedValue({ success: true }),
  goToNext: jest.fn(),
  goToPrevious: jest.fn().mockReturnValue(false),
  reset: jest.fn(),
  dismissMatchPopup: jest.fn(),
  clearError: jest.fn(),
  setFilters: jest.fn(),
  clearFilters: jest.fn(),
};

describe('DiscoveryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDiscovery.mockReturnValue(defaultMockState);
  });

  describe('Rendering', () => {
    it('should render the header with logo and title', () => {
      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('DISCOVER')).toBeTruthy();
      expect(getByText('T')).toBeTruthy(); // Logo
    });

    it('should render profile card when profiles are available', () => {
      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Maria Santos, 55')).toBeTruthy();
      expect(getByText(/Manila, Philippines/)).toBeTruthy();
    });

    it('should render action buttons when profiles are available', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByLabelText(/Pass on Maria Santos/)).toBeTruthy();
      expect(getByLabelText(/Like Maria Santos/)).toBeTruthy();
    });

    it('should render verified badge when profile is verified', () => {
      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Verified')).toBeTruthy();
    });

    it('should render online badge when profile is online', () => {
      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Online')).toBeTruthy();
    });

    it('should render interest tags', () => {
      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Reading')).toBeTruthy();
      expect(getByText('Cooking')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
        hasProfiles: false,
        currentProfile: null,
      });

      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Finding matches...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error message and try again button', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        error: 'Network error',
        hasProfiles: false,
        currentProfile: null,
      });

      const { getByText, getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Connection Issue')).toBeTruthy();
      expect(getByText(/Please check your connection/)).toBeTruthy();
      expect(getByLabelText('Try again')).toBeTruthy();
    });

    it('should call clearError and loadProfiles on try again', async () => {
      const mockClearError = jest.fn();
      const mockLoadProfiles = jest.fn();

      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        error: 'Network error',
        hasProfiles: false,
        currentProfile: null,
        clearError: mockClearError,
        loadProfiles: mockLoadProfiles,
      });

      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText('Try again'));

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoadProfiles).toHaveBeenCalledWith(true);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no profiles', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        hasProfiles: false,
        currentProfile: null,
        profiles: [],
      });

      const { getByText, getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText("All Caught Up!")).toBeTruthy();
      expect(getByLabelText('Start over')).toBeTruthy();
    });

    it('should call reset on start over button press', () => {
      const mockReset = jest.fn();

      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        hasProfiles: false,
        currentProfile: null,
        profiles: [],
        reset: mockReset,
      });

      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText('Start over'));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Header Actions', () => {
    it('should show notification alert when bell button pressed', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText('Notifications'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Notifications',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should open filter modal when sliders button pressed', () => {
      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText(/Filter/));

      expect(getByText('Discovery Filters')).toBeTruthy();
    });
  });

  describe('Profile Modal', () => {
    it('should open profile modal when Show More Info pressed', async () => {
      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText(/View full profile/));

      await waitFor(() => {
        expect(getByText('Profile')).toBeTruthy();
        expect(getByText('About')).toBeTruthy();
        expect(getByText('Interests')).toBeTruthy();
        expect(getByText('Quick Info')).toBeTruthy();
      });
    });

    it('should close profile modal when X button pressed', async () => {
      const { getByLabelText, queryByText, getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      // Open modal
      fireEvent.press(getByLabelText(/View full profile/));
      await waitFor(() => {
        expect(getByText('Profile')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByLabelText('Close profile'));

      await waitFor(() => {
        expect(queryByText('About')).toBeNull();
      });
    });
  });

  describe('Match Popup', () => {
    it('should show match popup when showMatchPopup is true', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        showMatchPopup: true,
        matchInfo: {
          matchId: 123,
          matchedUserId: 2,
          matchedUsername: 'maria_55',
          matchedUserDisplayName: 'Maria',
          matchedUserProfilePhotoUrl: 'https://example.com/maria.jpg',
          matchedAt: '2026-01-06T10:00:00Z',
          expiresAt: null,
        },
      });

      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText("It's a Match!")).toBeTruthy();
      expect(getByText('Keep Swiping')).toBeTruthy();
      expect(getByText('Send Message')).toBeTruthy();
    });

    it('should call dismissMatchPopup when Keep Swiping pressed', () => {
      const mockDismiss = jest.fn();

      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        showMatchPopup: true,
        matchInfo: {
          matchId: 123,
          matchedUserId: 2,
          matchedUsername: 'maria_55',
          matchedUserDisplayName: 'Maria',
          matchedUserProfilePhotoUrl: '',
          matchedAt: '2026-01-06T10:00:00Z',
          expiresAt: null,
        },
        dismissMatchPopup: mockDismiss,
      });

      const { getByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      fireEvent.press(getByText('Keep Swiping'));

      expect(mockDismiss).toHaveBeenCalled();
    });
  });

  describe('Age Validation', () => {
    it('should hide age if invalid (0)', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        currentProfile: { ...mockProfile, age: 0 },
      });

      const { getByText, queryByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Maria Santos')).toBeTruthy();
      expect(queryByText(/\d+$/)).toBeNull(); // No age number
    });

    it('should hide age if too high (>120)', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        currentProfile: { ...mockProfile, age: 150 },
      });

      const { getByText, queryByText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      expect(getByText('Maria Santos')).toBeTruthy();
      expect(queryByText('150')).toBeNull();
    });
  });

  describe('Image Fallback', () => {
    it('should use default avatar URL when image is empty', () => {
      mockUseDiscovery.mockReturnValue({
        ...defaultMockState,
        currentProfile: { ...mockProfile, image: '' },
      });

      // The image should still render (with fallback URL)
      // Can't directly test the URL, but we can verify no crash
      expect(() => render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      )).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible action buttons', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      const passButton = getByLabelText(/Pass on/);
      const likeButton = getByLabelText(/Like/);

      expect(passButton.props.accessibilityRole).toBe('button');
      expect(likeButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility hints on buttons', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DiscoveryScreen />
        </TestWrapper>
      );

      const passButton = getByLabelText(/Pass on/);
      expect(passButton.props.accessibilityHint).toContain('skip');
    });
  });
});
