import { useSettingsStore } from '../store/settings';
import { Dimensions } from 'react-native';

// テーマの型定義
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  cardElevated: string;
  cardGradientStart: string;
  cardGradientEnd: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  notification: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  disabled: string;
  shadow: string;
  overlay: string;
  ripple: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  glass: string;
  highlight: string;
}

export interface ThemeType {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      loose: number;
    };
  };
  elevation: {
    small: object;
    medium: object;
    large: object;
  };
}

// 画面サイズ取得用ユーティリティ
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// アニメーション定数
export const ANIMATION = {
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    IN_OUT: 'easeInOut',
    OUT: 'easeOut',
    IN: 'easeIn',
  },
  SPRING: {
    GENTLE: {
      damping: 15,
      stiffness: 100,
    },
    BOUNCY: {
      damping: 10,
      stiffness: 150,
    },
    RESPONSIVE: {
      damping: 20,
      stiffness: 300,
    }
  }
};

// 洗練されたテーマカラー定義
const theme: ThemeType = {
  colors: {
    primary: '#4285F4',
    primaryLight: '#8AB4F8',
    primaryDark: '#1A73E8',
    secondary: '#34A853',
    secondaryLight: '#81C995',
    secondaryDark: '#188038',
    accent: '#FBBC05',
    accentLight: '#FDD663',
    accentDark: '#F29900',
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F1F3F4',
    card: '#F5F5F5',
    cardElevated: '#FFFFFF',
    cardGradientStart: 'rgba(255, 255, 255, 0.9)',
    cardGradientEnd: 'rgba(248, 249, 250, 0.95)',
    text: '#202124',
    textSecondary: '#5F6368',
    textTertiary: '#9AA0A6',
    textInverse: '#FFFFFF',
    border: '#DADCE0',
    borderLight: '#E8EAED',
    notification: '#EA4335',
    error: '#EA4335',
    success: '#34A853',
    warning: '#FBBC05',
    info: '#4285F4',
    disabled: '#DADCE0',
    shadow: 'rgba(60, 64, 67, 0.1)',
    overlay: 'rgba(32, 33, 36, 0.4)',
    ripple: 'rgba(66, 133, 244, 0.12)',
    glass: 'rgba(255, 255, 255, 0.7)',
    highlight: '#E8F0FE',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'Hiragino Sans',
      medium: 'Hiragino Sans',
      bold: 'Hiragino Sans',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      loose: 1.8,
    },
  },
  elevation: {
    small: {
      shadowColor: 'rgba(60, 64, 67, 0.3)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: 'rgba(60, 64, 67, 0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: 'rgba(60, 64, 67, 0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// ダークテーマの定義
export const lightTheme: ThemeType = theme;
export const darkTheme: ThemeType = {
  ...theme,
  colors: {
    primary: '#8AB4F8',
    primaryLight: '#ADC8FF',
    primaryDark: '#669DF6',
    secondary: '#81C995',
    secondaryLight: '#A8DAB5',
    secondaryDark: '#5BB974',
    accent: '#FDD663',
    accentLight: '#FEE695',
    accentDark: '#FCC934',
    background: '#202124',
    backgroundSecondary: '#303134',
    backgroundTertiary: '#3C4043',
    card: '#303134',
    cardElevated: '#3C4043',
    cardGradientStart: 'rgba(60, 64, 67, 0.9)',
    cardGradientEnd: 'rgba(48, 49, 52, 0.95)',
    text: '#E8EAED',
    textSecondary: '#BDC1C6',
    textTertiary: '#9AA0A6',
    textInverse: '#202124',
    border: '#5F6368',
    borderLight: '#3C4043',
    notification: '#F28B82',
    error: '#F28B82',
    success: '#81C995',
    warning: '#FDD663',
    info: '#8AB4F8',
    disabled: '#5F6368',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    ripple: 'rgba(138, 180, 248, 0.12)',
    glass: 'rgba(32, 33, 36, 0.7)',
    highlight: '#3C4043',
  },
};

// テーマフック
export const useTheme = (): ThemeType => {
  const { theme: themeType } = useSettingsStore();
  return themeType === 'dark' ? darkTheme : lightTheme;
};

// デフォルトエクスポート
export default theme;
