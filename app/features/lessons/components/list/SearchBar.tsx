import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType } from '../../../../theme/index';

interface SearchBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  theme: ThemeType;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchText, onSearchChange, theme }) => {
  return (
    <View style={[
      styles.searchContainer, 
      { 
        backgroundColor: theme.colors.backgroundTertiary,
        borderColor: theme.colors.borderLight 
      }
    ]}>
      <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={[
          styles.searchInput, 
          { 
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.regular
          }
        ]}
        placeholder="レッスンを検索"
        placeholderTextColor={theme.colors.textTertiary}
        value={searchText}
        onChangeText={onSearchChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 4,
  },
});

export default SearchBar;
