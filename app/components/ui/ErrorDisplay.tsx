import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Button } from './Button';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorDisplay = ({
  message,
  onRetry,
  style,
}: ErrorDisplayProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <MaterialIcons name="error-outline" size={48} color={colors.error} />
      <Text style={[styles.message, { color: colors.textPrimary }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          title="再試行"
          onPress={onRetry}
          variant="outline"
          style={styles.retryButton}
        />
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
  message: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
});
