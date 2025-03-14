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
import { useTheme } from '../../../../theme/index';
import { LinearGradient } from 'expo-linear-gradient';

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
  const theme = useTheme();

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
      style={[
        styles.lessonCard, 
        { 
          backgroundColor: theme.colors.cardElevated,
          borderColor: theme.colors.borderLight,
          ...theme.elevation.small
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.leftAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[
            styles.teacherText, 
            { 
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamily.medium
            }
          ]}>
            {teacher}
          </Text>
          <Text style={[
            styles.dateText, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamily.regular
            }
          ]}>
            {date}
          </Text>
        </View>
        
        <Text 
          style={[
            styles.pieceText, 
            { 
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamily.bold
            }
          ]} 
          numberOfLines={2}
        >
          {pieces[0] || '曲名なし'}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.tagsContainer}>
            {tags.slice(0, 3).map((tag, index) => (
              <View 
                key={index} 
                style={[
                  styles.tagChip, 
                  {
                    backgroundColor: `${theme.colors.primaryLight}20`,
                    borderColor: `${theme.colors.primaryLight}40`,
                  }
                ]}
              >
                <Text 
                  style={[
                    styles.tagText, 
                    {
                      color: theme.colors.primary,
                      fontFamily: theme.typography.fontFamily.medium
                    }
                  ]}
                >
                  {tag}
                </Text>
              </View>
            ))}
            {tags.length > 3 && (
              <Text 
                style={[
                  styles.moreTagsText, 
                  {
                    color: theme.colors.textTertiary,
                    fontFamily: theme.typography.fontFamily.regular
                  }
                ]}
              >
                +{tags.length - 3}
              </Text>
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
                  size={22} 
                  color={isFavorite ? theme.colors.error : theme.colors.textTertiary} 
                />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDeletePress}
            >
              <MaterialIcons 
                name="delete-outline" 
                size={22} 
                color={theme.colors.textTertiary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  lessonCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  leftAccent: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teacherText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pieceText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 24,
    letterSpacing: 0.2,
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
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  moreTagsText: {
    fontSize: 12,
    marginLeft: 4,
    alignSelf: 'center',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 6,
  },
});

export default LessonCard;
