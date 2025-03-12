import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import SearchBar from './SearchBar';
import TagFilter from './TagFilter';

interface ListHeaderProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  searchText,
  onSearchChange,
  availableTags,
  selectedTags,
  onTagPress,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>レッスン一覧</Text>
      <SearchBar 
        searchText={searchText} 
        onSearchChange={onSearchChange} 
      />
      <TagFilter 
        availableTags={availableTags} 
        selectedTags={selectedTags} 
        onTagPress={onTagPress} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default ListHeader;
