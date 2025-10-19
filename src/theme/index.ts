// /mnt/data/index.ts
import { Platform } from 'react-native';
import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import { MD3Typescale, ThemeProp } from 'react-native-paper/lib/typescript/types';

// ---- Android font family map ----
// Using Lexend font family for better readability and modern design
const androidFamilies = {
  '100': 'Lexend-Thin',
  '200': 'Lexend-ExtraLight',
  '300': 'Lexend-Light',
  '400': 'Lexend-Regular',
  '500': 'Lexend-Medium',
  '600': 'Lexend-SemiBold',
  '700': 'Lexend-Bold',
  '800': 'Lexend-ExtraBold',
  '900': 'Lexend-Black',
} as const;

type WeightKey = keyof typeof androidFamilies;

const baseFonts = MD3LightTheme.fonts as MD3Typescale;
type FontEntry = [keyof MD3Typescale, MD3Typescale[keyof MD3Typescale]];

const entries = Object.entries(baseFonts) as FontEntry[];

// Configure fonts: using Lexend for improved readability across all platforms
const fonts = configureFonts({
  isV3: true,
  config: Object.fromEntries(
    entries.map(([k, v]) => {
      const w = String((v as any)?.fontWeight ?? '400') as WeightKey;

      if (Platform.OS === 'android') {
        return [
          k,
          {
            ...(v as any),
            fontFamily: androidFamilies[w] ?? 'Lexend-Regular',
            fontWeight: 'normal',
          },
        ];
      }

      if (Platform.OS === 'web') {
        // On web use Lexend with system fallbacks
        return [
          k,
          {
            ...(v as any),
            fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, sans-serif',
          },
        ];
      }

      // iOS / other platforms
      return [k, { ...(v as any), fontFamily: 'Lexend' }];
    })
  ) as MD3Typescale,
});

// ---------------------
// Monochrome Design Tool — theme tokens
// ---------------------
export const MONO = {
  // Core monochrome palette
  black: '#000000',
  white: '#FFFFFF',
  gray900: '#0F1112',
  gray800: '#1A1A1A',
  gray700: '#2B2B2B',
  gray600: '#3C3C3C',
  gray500: '#6E6E73',
  gray400: '#9A9A9A',
  gray300: '#CFCFD1',
  gray200: '#E6E6E6',
  gray100: '#F5F5F6',
  silver: '#D8D8DA',

  // Accent (used very sparingly, glyph-inspired)
  accentRed: '#FF0000',

  // Borders & glass
  borderSoft: 'rgba(0,0,0,0.08)', // thin 1px soft border for clean separation
  glassTint: 'rgba(255,255,255,0.6)', // for subtle glass/transparent overlays
  shadowTint: 'rgba(0,0,0,0.06)',
};

// Layout / spacing tokens (generous white space per brief)
export const spacing = {
  page: 24, // main page padding (>=20px)
  container: 20, // use this for card padding / list item padding
  small: 8,
  medium: 16,
  large: 32,
};

// Border / radius tokens
export const borders = {
  borderWidth: 1,
  borderColor: MONO.borderSoft,
  radius: 10,
};

// ---------------------
// Light theme (primary theme as requested)
// ---------------------
export const lightTheme: ThemeProp = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    // core surfaces
    background: MONO.white, // lots of white space
    surface: MONO.white,
    surfaceVariant: MONO.gray100,
    // text / primary
    primary: MONO.black, // primary interactions use black for strong contrast
    onPrimary: MONO.white,
    onSurface: MONO.black,
    // accents (used very sparingly)
    accent: MONO.accentRed,
    // secondary / outline / borders
    secondary: MONO.gray500,
    outline: MONO.gray200,
    inverseSurface: MONO.gray900,
    // error
    error: '#D64545',
    onError: MONO.white,
    // additional helpful tokens
    backdrop: 'rgba(0,0,0,0.06)',
    // keep Material keys consistent
    primaryContainer: MONO.gray100,
    onPrimaryContainer: MONO.black,
    onSecondaryContainer: MONO.black,
  } as any,
};

// ---------------------
// Dark theme (keeps monochrome feel for dark surfaces)
// ---------------------
export const darkTheme: ThemeProp = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    background: MONO.gray900,
    surface: '#0B0B0B',
    surfaceVariant: MONO.gray800,
    primary: MONO.white, // in dark mode, primary elements are white
    onPrimary: MONO.black,
    secondary: MONO.gray400,
    outline: 'rgba(255,255,255,0.06)',
    error: '#FF6B6B',
    accent: MONO.accentRed,
    onSurface: MONO.white,
  } as any,
};

// Re-export a typed useTheme hook so consumers can import from the project's theme module
export type AppTheme = ThemeProp;

export const useTheme = (): AppTheme => usePaperTheme() as AppTheme;
