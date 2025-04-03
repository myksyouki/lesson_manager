import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * 汎用ボタンコンポーネント
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  onPress,
  ...rest
}) => {
  const theme = useTheme();
  
  // ボタンのスタイルを取得
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.6 : 1,
    };
    
    // サイズに応じたスタイル
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = theme.spacing.xs;
        break;
      case 'large':
        baseStyle.paddingVertical = theme.spacing.lg;
        break;
      default:
        baseStyle.paddingVertical = theme.spacing.sm;
    }
    
    // バリアントに応じたスタイル
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = theme.colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.primary;
        break;
      case 'text':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = theme.colors.error;
        break;
    }
    
    // 幅の設定
    if (fullWidth) {
      baseStyle.width = '100%';
    }
    
    return baseStyle;
  };
  
  // テキストのスタイルを取得
  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: 'center',
    };
    
    // サイズに応じたスタイル
    switch (size) {
      case 'small':
        baseStyle.fontSize = theme.typography.fontSize.sm;
        break;
      case 'large':
        baseStyle.fontSize = theme.typography.fontSize.lg;
        break;
      default:
        baseStyle.fontSize = theme.typography.fontSize.md;
    }
    
    // バリアントに応じたスタイル
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        baseStyle.color = theme.colors.textInverse;
        break;
      case 'outline':
      case 'text':
        baseStyle.color = theme.colors.primary;
        break;
    }
    
    return baseStyle;
  };
  
  // ローディングインジケーターの色を取得
  const getLoaderColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return theme.colors.textInverse;
      case 'outline':
      case 'text':
        return theme.colors.primary;
      default:
        return theme.colors.textInverse;
    }
  };

  // アイコンがある場合のテキストスタイル
  const getIconTextStyle = (): TextStyle | undefined => {
    if (leftIcon) {
      return { marginLeft: theme.spacing.xs };
    }
    if (rightIcon) {
      return { marginRight: theme.spacing.xs };
    }
    return undefined;
  };
  
  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} size="small" />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[getTextStyle(), getIconTextStyle(), textStyle]}>
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
});

// デフォルトエクスポートを追加
export default Button;
