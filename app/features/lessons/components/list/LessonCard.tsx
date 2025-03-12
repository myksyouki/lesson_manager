import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLessonStore } from '../../../../store/lessons';

interface LessonCardProps {
  id: string;
  teacher: string;
  date: string;
  pieces: string[];
  tags: string[];
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
}

const LessonCard: React.FC<LessonCardProps> = ({
  id,
  teacher,
  date,
  pieces,
  tags,
  isFavorite = false,
  showFavoriteButton = true,
}) => {
  const { toggleFavorite, deleteLesson } = useLessonStore();

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

  const handleDeletePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    Alert.alert(
      'レッスンの削除',
      'このレッスンを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          onPress: async () => {
            try {
              await deleteLesson(id);
              console.log(`レッスンを削除しました: ${id}`);
            } catch (error) {
              console.error('レッスン削除エラー:', error);
              Alert.alert('エラー', 'レッスンの削除に失敗しました');
            }
          }, 
          style: 'destructive' 
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.lessonCard} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.teacherText}>{teacher}</Text>
        <Text style={styles.dateText}>{date}</Text>
      </View>
      
      <Text style={styles.pieceText} numberOfLines={2}>{pieces[0] || '曲名なし'}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.tagsContainer}>
          {tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{tags.length - 3}</Text>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          {showFavoriteButton && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleFavoritePress}
            >
              <MaterialIcons 
                name={isFavorite ? "favorite" : "favorite-border"} 
                size={24} 
                color={isFavorite ? "#FF3B30" : "#8E8E93"} 
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDeletePress}
          >
            <MaterialIcons 
              name="delete" 
              size={24} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  lessonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teacherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  pieceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tagChip: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#636366',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    alignSelf: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default LessonCard;
