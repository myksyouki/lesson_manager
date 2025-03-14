import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLessonStore } from '../store/lessons';

interface LessonCardProps {
  id: string;
  teacher: string;
  date: string;
  piece: string;
  tags: string[];
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
}

export default function LessonCard({
  id,
  teacher,
  date,
  piece,
  tags,
  isFavorite = false,
  showFavoriteButton = true,
}: LessonCardProps) {
  const { toggleFavorite } = useLessonStore();

  const handlePress = () => {
    router.push({
      pathname: '/lesson-detail',
      params: { id },
    });
  };

  const handleFavoritePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  return (
    <TouchableOpacity 
      style={styles.lessonCard} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.lessonDate}>{date}</Text>
        {showFavoriteButton && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={handleFavoritePress}
          >
            <MaterialIcons 
              name={isFavorite ? "favorite" : "favorite-border"} 
              size={24} 
              color={isFavorite ? "#FF3B30" : "#8E8E93"} 
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.lessonTeacher}>{teacher}</Text>
      <Text style={styles.lessonPiece}>{piece}</Text>
      <View style={styles.tagContainer}>
        {tags && tags.map((tag, index) => (
          <View key={`${id}-tag-${index}`} style={styles.lessonTag}>
            <Text style={styles.lessonTagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  lessonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonDate: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  favoriteButton: {
    padding: 4,
  },
  lessonTeacher: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  lessonPiece: {
    fontSize: 17,
    color: '#636366',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lessonTag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 4,
  },
  lessonTagText: {
    fontSize: 13,
    color: '#636366',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
