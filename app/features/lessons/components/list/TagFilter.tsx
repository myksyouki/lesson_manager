import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagPress,
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
          style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
          onPress={() => onTagPress(tag)}>
          <Text
            style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.tagTextSelected,
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
    marginBottom: 16,
  },
  tagScrollContent: {
    paddingRight: 20,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  tagSelected: {
    backgroundColor: '#1a73e8',
  },
  tagText: {
    fontSize: 15,
    color: '#5f6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default TagFilter;
