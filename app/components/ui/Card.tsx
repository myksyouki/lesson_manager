import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: number;
  padding?: number | string;
  margin?: number | string;
}

export const Card = ({
  children,
  style,
  elevation = 2,
  padding = 16,
  margin = 0,
}: CardProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          padding,
          margin,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: elevation,
          elevation,
        },
        style,
      ]}
    >
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
