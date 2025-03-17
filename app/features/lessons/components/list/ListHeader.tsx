import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../../theme/index';
import SearchBar from './SearchBar';
import TagFilter from './TagFilter';
import { MaterialIcons } from '@expo/vector-icons';

interface ListHeaderProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
  isSelectionMode?: boolean;
  toggleSelectionMode?: () => void;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  searchText,
  onSearchChange,
  availableTags,
  selectedTags,
  onTagPress,
  isSelectionMode = false,
  toggleSelectionMode = () => {},
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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { 
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.bold
          }]}>
            レッスン一覧
          </Text>
          
          <TouchableOpacity
            style={[
              styles.selectionButton,
              isSelectionMode && { backgroundColor: theme.colors.primaryLight }
            ]}
            onPress={toggleSelectionMode}
          >
            <MaterialIcons 
              name={isSelectionMode ? "close" : "check-box-outline-blank"} 
              size={24} 
              color={isSelectionMode ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.selectionButtonText,
              { color: isSelectionMode ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              {isSelectionMode ? '選択解除' : '複数選択'}
            </Text>
          </TouchableOpacity>
        </View>
        
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ListHeader;
