import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { ThemeType } from '../../../../theme/index';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
  theme: ThemeType;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagPress,
  theme
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tagScrollView}
      contentContainerStyle={styles.tagScrollContent}>
      {availableTags.map((tag) => (
        <TouchableOpacity
          key={tag}
          style={[
            styles.tag, 
            { 
              backgroundColor: selectedTags.includes(tag) 
                ? theme.colors.highlight 
                : theme.colors.backgroundTertiary,
              borderColor: selectedTags.includes(tag) 
                ? theme.colors.primary 
                : theme.colors.borderLight,
            }
          ]}
          onPress={() => onTagPress(tag)}>
          <Text
            style={[
              styles.tagText,
              { 
                color: selectedTags.includes(tag) 
                  ? theme.colors.primary 
                  : theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamily.medium,
                fontWeight: selectedTags.includes(tag) ? '600' : '500',
              }
            ]}>
            {tag}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tagScrollView: {
    marginBottom: 12,
  },
  tagScrollContent: {
    paddingRight: 20,
  },
  tag: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tagText: {
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 1,
  },
});

export default TagFilter;
