import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingIndicator = ({
  size = 'large',
  message,
  fullScreen = false,
  style,
}: LoadingIndicatorProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        style,
      ]}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 999,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});
