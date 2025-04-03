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
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  leftIcon?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  onLeftIconPress?: () => void;
  style?: any;
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
  style,
  ...rest
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // 入力フィールドのスタイルを取得
  const getInputStyle = () => ({
    fontSize: 16,
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 12,
    paddingLeft: leftIcon ? 36 : 12,
    paddingRight: rightIcon ? 36 : 12,
  });

  // フォーカスハンドラー
  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };
  
  // 最終的なスタイルを取得
  const getFinalStyle = () => {
    const baseStyle = getInputStyle();
    
    // カスタムスタイルと組み合わせる
    return [
      baseStyle,
      {
        borderWidth: 1,
        borderColor: error 
          ? theme.colors.error 
          : isFocused 
            ? theme.colors.primary 
            : theme.colors.border,
        borderRadius: 8,
        backgroundColor: theme.colors.backgroundSecondary,
      },
      rest.multiline && {
        minHeight: 100,
        textAlignVertical: 'top',
      },
      style, // 渡されたカスタムスタイル
    ];
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        error && { borderColor: theme.colors.error },
        isFocused && { borderColor: theme.colors.primary }
      ]}>
        {leftIcon && (
          <TouchableOpacity 
            style={styles.leftIcon} 
            onPress={onLeftIconPress}
            disabled={!onLeftIconPress}
          >
            <MaterialIcons 
              name={leftIcon} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        
        <TextInput
          style={getFinalStyle()}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {helper && !error && <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>{helper}</Text>}
      {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    padding: 4,
  },
  rightIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    paddingHorizontal: 4,
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

// デフォルトエクスポートを追加
export default TextField; 