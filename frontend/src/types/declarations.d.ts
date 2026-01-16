/**
 * Type declarations for external modules
 */

// @expo/vector-icons types
declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const Feather: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const MaterialIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const MaterialCommunityIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const Ionicons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const FontAwesome: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const FontAwesome5: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const AntDesign: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const Entypo: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const EvilIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const Octicons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const SimpleLineIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
  export const Foundation: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
}

// expo-linear-gradient types (if not available)
declare module 'expo-linear-gradient' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
  }

  export const LinearGradient: ComponentType<LinearGradientProps>;
}
