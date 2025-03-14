import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../../theme/index';
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
  const theme = useTheme();

  const renderBackground = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={80}
          tint={theme.colors.background === '#FFFFFF' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    
    return (
      <LinearGradient
        colors={[theme.colors.cardGradientStart, theme.colors.cardGradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
    );
  };

  return (
    <View style={[styles.headerContainer, { borderBottomColor: theme.colors.borderLight }]}>
      {renderBackground()}
      <View style={styles.header}>
        <Text style={[styles.title, { 
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.bold
        }]}>
          レッスン一覧
        </Text>
        <SearchBar 
          searchText={searchText} 
          onSearchChange={onSearchChange} 
          theme={theme}
        />
        <TagFilter 
          availableTags={availableTags} 
          selectedTags={selectedTags} 
          onTagPress={onTagPress} 
          theme={theme}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    borderBottomWidth: 0.5,
    overflow: 'hidden',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
});

export default ListHeader;
