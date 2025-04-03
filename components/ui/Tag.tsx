import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface TagProps {
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Tag = ({
  label,
  onPress,
  onRemove,
  selected = false,
  disabled = false,
  style,
  textStyle,
}: TagProps) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.disabled;
    if (selected) return colors.primary;
    return colors.tagBackground;
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    if (selected) return colors.white;
    return colors.textPrimary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.tag,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tag: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Tag;
