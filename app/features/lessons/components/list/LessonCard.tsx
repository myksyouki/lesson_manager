import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  GestureResponderEvent,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLessonStore, Lesson } from '../../../../../store/lessons';
import { useTheme } from '../../../../../theme/index';

interface LessonCardProps {
  id?: string;
  teacher?: string;
  date?: string;
  pieces?: string[];
  tags?: string[];
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  lesson?: Lesson;
}

const LessonCard: React.FC<LessonCardProps> = ({
  id,
  teacher = '講師名なし',
  date = '日付なし',
  pieces = [],
  tags = [],
  isFavorite = false,
  showFavoriteButton = true,
  isSelectionMode = false,
  isSelected = false,
  onSelect = () => {},
  onPress,
  onLongPress,
  lesson,
}) => {
  const theme = useTheme();
  const { toggleFavorite, deleteLesson } = useLessonStore();

  const lessonId = lesson?.id || id || '';
  const lessonTeacher = lesson?.teacher || teacher || '講師名なし';
  const lessonDate = lesson?.date || date || '日付なし';
  const lessonPieces = lesson?.pieces || pieces || [];
  const lessonTags = lesson?.tags || tags || [];
  const lessonIsFavorite = lesson?.isFavorite || isFavorite;

  const handlePress = () => {
    if (isSelectionMode) {
      onSelect(lessonId);
    } else {
      if (onPress) {
        onPress();
      } else {
        router.push(`/lesson-detail/${lessonId}`);
      }
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    }
  };

  const handleFavoritePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    toggleFavorite(lessonId);
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
              await deleteLesson(lessonId);
              console.log(`レッスンを削除しました: ${lessonId}`);
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

  // 表示するタグの最大数
  const maxVisibleTags = 3;
  // タグが多すぎる場合に表示する残りのタグ数
  const remainingTags = lessonTags.length > maxVisibleTags ? lessonTags.length - maxVisibleTags : 0;

  // ピアノのアイコンを表示
  const musicIcon = () => {
    // 学習ラベルに基づいて色を決定
    let iconColor = '#4285F4'; // デフォルト（青）- 基本ラベル
    
    if (lesson?.priority === 'high') {
      iconColor = '#EA4335'; // 重点ラベル（赤）
    } else if (lesson?.priority === 'low') {
      iconColor = '#34A853'; // 参考ラベル（緑）
    }
    
    return (
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <MaterialIcons name="music-note" size={22} color="#ffffff" />
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        isSelected && styles.selectedCard
      ]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={700}
    >
      {/* 選択インジケーター */}
      {isSelectionMode && (
        <View style={styles.selectionIndicator}>
          <MaterialIcons 
            name={isSelected ? "check-circle" : "radio-button-unchecked"} 
            size={32} 
            color={isSelected ? "#4285F4" : "rgba(0,0,0,0.15)"} 
          />
        </View>
      )}
      
      {/* カードヘッダー */}
      <View style={styles.cardHeader}>
        {musicIcon()}
        <View style={styles.headerInfo}>
          <Text style={styles.teacherName}>{lessonTeacher}</Text>
          <Text style={styles.lessonDate}>{lessonDate}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          {showFavoriteButton && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleFavoritePress}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <MaterialIcons 
                name={lessonIsFavorite ? "favorite" : "favorite-border"} 
                size={22} 
                color={lessonIsFavorite ? theme.colors.error : theme.colors.textTertiary} 
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.iconButton, styles.deleteButton]}
            onPress={handleDeletePress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <MaterialIcons 
              name="delete-outline" 
              size={22} 
              color={theme.colors.textTertiary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 曲名 */}
      <Text style={styles.pieceTitle} numberOfLines={2}>
        {Array.isArray(lessonPieces) && lessonPieces.length > 0 
          ? lessonPieces[0] 
          : '曲名なし'}
      </Text>
      
      {/* タグ */}
      {Array.isArray(lessonTags) && lessonTags.length > 0 && (
        <View style={styles.tagsContainer}>
          {lessonTags.slice(0, maxVisibleTags).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          
          {remainingTags > 0 && (
            <View style={[styles.tag, styles.moreTag]}>
              <Text style={[styles.tagText, styles.moreTagText]}>+{remainingTags}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    width: '93%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 2,
  },
  lessonDate: {
    fontSize: 13,
    color: '#5F6368',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginLeft: 'auto',
    minWidth: 80,  // さらに幅を広げる
  },
  iconButton: {
    padding: 8,    // パディングを増やす
    marginLeft: 6,
  },
  deleteButton: {
    marginLeft: 12,  // さらに余白を増やす
  },
  pieceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 14,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '500',
  },
  moreTag: {
    backgroundColor: 'rgba(66, 133, 244, 0.04)',
  },
  moreTagText: {
    color: '#5F6368',
  },
  selectionIndicator: {
    position: 'absolute',
    right: 12,
    bottom: 12,   // 上から下へ移動
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 4,   // タップ領域を広げる
    borderRadius: 20,
  },
});

export default LessonCard;
