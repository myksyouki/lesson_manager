import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  onLeftIconPress?: () => void;
}

/**
 * 汎用テキスト入力コンポーネント
 */
export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helper,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  helperStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onLeftIconPress,
  onFocus,
  onBlur,
  ...rest
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // 入力フィールドのスタイルを取得
  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
    };

    if (isFocused) {
      baseStyle.borderColor = theme.colors.primary;
    } else if (error) {
      baseStyle.borderColor = theme.colors.error;
    } else {
      baseStyle.borderColor = theme.colors.border;
    }

    return baseStyle;
  };

  // 入力フィールドのテキストスタイルを取得
  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text,
    };
  };

  // ラベルのスタイルを取得
  const getLabelStyle = (): TextStyle => {
    return {
      marginBottom: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: error ? theme.colors.error : theme.colors.textSecondary,
    };
  };

  // エラーメッセージのスタイルを取得
  const getErrorStyle = (): TextStyle => {
    return {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.error,
    };
  };

  // ヘルパーテキストのスタイルを取得
  const getHelperStyle = (): TextStyle => {
    return {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
    };
  };

  // フォーカスハンドラー
  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  // ブラーハンドラー
  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <TouchableOpacity
            onPress={onLeftIconPress}
            disabled={!onLeftIconPress}
            style={styles.iconContainer}
          >
            {leftIcon}
          </TouchableOpacity>
        )}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconContainer}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={[getErrorStyle(), errorStyle]}>{error}</Text>}
      {!error && helper && <Text style={[getHelperStyle(), helperStyle]}>{helper}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  iconContainer: {
    paddingHorizontal: 4,
  },
}); 