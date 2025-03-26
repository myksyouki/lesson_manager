import React from 'react';
import { View, TextInput, StyleSheet, Platform, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ThemeType } from '../../../../theme/index';

interface SearchBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  isDetailedSearch: boolean;
  onDetailedSearchChange: (value: boolean) => void;
  isTagsVisible: boolean;
  onTagsVisibleChange: (value: boolean) => void;
  theme: ThemeType;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchText, 
  onSearchChange, 
  isDetailedSearch,
  onDetailedSearchChange,
  isTagsVisible,
  onTagsVisibleChange,
  theme 
}) => {
  return (
    <View>
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
              fontFamily: theme.typography.fontFamily.regular,
            }
          ]}
          placeholder=""
          placeholderTextColor={theme.colors.textTertiary}
          value={searchText}
          onChangeText={onSearchChange}
          numberOfLines={1}
          multiline={false}
        />
      </View>
      
      <View style={styles.togglesContainer}>
        <TouchableOpacity 
          style={styles.tagToggleButton} 
          onPress={() => onTagsVisibleChange(!isTagsVisible)}
        >
          <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>
            タグ
          </Text>
          <MaterialIcons 
            name={isTagsVisible ? "expand-more" : "expand-less"} 
            size={20} 
            color={theme.colors.textSecondary} 
          />
        </TouchableOpacity>
        
        <View style={styles.detailedSearchContainer}>
          <Text style={[styles.detailedSearchText, { color: theme.colors.textSecondary }]}>
            詳細検索
          </Text>
          <Switch
            value={isDetailedSearch}
            onValueChange={onDetailedSearchChange}
            trackColor={{ false: theme.colors.borderLight, true: theme.colors.primary }}
            thumbColor={Platform.OS === 'ios' ? '#fff' : isDetailedSearch ? theme.colors.primaryLight : '#f4f3f4'}
          />
        </View>
      </View>
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
    marginBottom: 8,
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
    width: '100%',
    ...Platform.select({
      ios: {
        height: 48,
        paddingTop: 6
      },
      android: {
        textAlignVertical: 'center'
      }
    })
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 0,
  },
  tagToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
    marginRight: 2,
  },
  detailedSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailedSearchText: {
    fontSize: 12,
    marginRight: 8,
  }
});

export default SearchBar;
