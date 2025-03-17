import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../theme';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * 汎用カードコンポーネント
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 'small',
  onPress,
  disabled = false,
  ...rest
}) => {
  const theme = useTheme();

  // カードのスタイルを取得
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      overflow: 'hidden',
    };

    // 影のスタイル
    switch (elevation) {
      case 'none':
        break;
      case 'small':
        Object.assign(baseStyle, theme.elevation.small);
        break;
      case 'medium':
        Object.assign(baseStyle, theme.elevation.medium);
        break;
      case 'large':
        Object.assign(baseStyle, theme.elevation.large);
        break;
    }

    return baseStyle;
  };

  // タッチ可能なカード
  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // 通常のカード
  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

// カードのヘッダーコンポーネント
interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  const theme = useTheme();
  
  return (
    <View style={[
      {
        marginBottom: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
      },
      style
    ]}>
      {children}
    </View>
  );
};

// カードの本文コンポーネント
interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, style }) => {
  return (
    <View style={style}>
      {children}
    </View>
  );
};

// カードのフッターコンポーネント
interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  const theme = useTheme();
  
  return (
    <View style={[
      {
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
      },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
  },
});
