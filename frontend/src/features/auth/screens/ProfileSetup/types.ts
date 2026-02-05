/**
 * ProfileSetup Types
 */

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/types';

export type ProfileSetupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProfileSetup'>;
export type ProfileSetupScreenRouteProp = RouteProp<AuthStackParamList, 'ProfileSetup'>;

export interface ProfileSetupScreenProps {
  navigation: ProfileSetupScreenNavigationProp;
  route: ProfileSetupScreenRouteProp;
}

export interface ProfileFormState {
  displayName: string;
  birthDate: string;
  city: string;
  gender: 'Male' | 'Female' | '';
  interestedIn: 'Men' | 'Women' | 'Both' | '';
  profilePhotoUri: string | null;
  loading: boolean;
  error: string | null;
  reduceMotion: boolean;
}

export type ProfileFormAction =
  | { type: 'SET_DISPLAY_NAME'; payload: string }
  | { type: 'SET_BIRTH_DATE'; payload: string }
  | { type: 'SET_CITY'; payload: string }
  | { type: 'SET_GENDER'; payload: 'Male' | 'Female' | '' }
  | { type: 'SET_INTERESTED_IN'; payload: 'Men' | 'Women' | 'Both' | '' }
  | { type: 'SET_PROFILE_PHOTO'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_REDUCE_MOTION'; payload: boolean };
