import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
  Platform,
  ViewStyle,
  StyleProp,
  TouchableOpacityProps,
} from 'react-native';

interface RippleButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
  borderless?: boolean;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  style,
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  borderless = false,
  ...props
}) => {
  // Androidの場合はTouchableNativeFeedbackを使用
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, style]}>
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.Ripple(rippleColor, borderless)}
          {...props}
        >
          <View style={styles.content}>
            {children}
          </View>
        </TouchableNativeFeedback>
      </View>
    );
  }

  // iOSの場合はTouchableOpacityを使用
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

// デフォルトエクスポートを追加
export default RippleButton;
