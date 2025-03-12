import { useSettingsStore } from '../store/settings';

// テーマカラー定義
export const lightTheme = {
  colors: {
    primary: '#4285F4',
    secondary: '#34A853',
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    notification: '#F44336',
    error: '#F44336',
    success: '#34A853',
    warning: '#FBBC05',
    info: '#4285F4',
    disabled: '#BDBDBD',
  },
};

export const darkTheme = {
  colors: {
    primary: '#4285F4',
    secondary: '#34A853',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#2C2C2C',
    notification: '#F44336',
    error: '#F44336',
    success: '#34A853',
    warning: '#FBBC05',
    info: '#4285F4',
    disabled: '#5C5C5C',
  },
};

// テーマフック
export const useTheme = () => {
  const { theme } = useSettingsStore();
  return theme === 'dark' ? darkTheme : lightTheme;
};
