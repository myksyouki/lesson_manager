/**
 * レッスンカードコンポーネント
 * 
 * レッスン一覧で表示される個々のレッスンカードを提供します。
 * 教師名、日付、楽曲情報、タグ、お気に入りの状態などを表示します。
 */
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

// 定数
const COLORS = {
  CARD_BACKGROUND: '#ffffff',
  TEXT_PRIMARY: '#1C1C1E',
  TEXT_SECONDARY: '#636366',
  TEXT_TERTIARY: '#8E8E93',
  FAVORITE_ACTIVE: '#FF3B30',
  FAVORITE_INACTIVE: '#8E8E93',
  TAG_BACKGROUND: '#F2F2F7',
  TAG_TEXT: '#636366',
};

// 型定義
interface LessonCardProps {
  id: string;
  teacher: string;
  date: string;
  piece: string;
  tags: string[];
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
}

/**
 * レッスンカードコンポーネント
 */
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

  /**
   * レッスン詳細画面に遷移
   */
  const handlePress = () => {
    router.push({
      pathname: '/(lesson-detail)',
      params: { id },
    });
  };

  /**
   * お気に入りの状態を切り替え
   */
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
      {renderCardHeader(date, isFavorite, showFavoriteButton, handleFavoritePress)}
      {renderTeacherName(teacher)}
      {renderPieceInfo(piece)}
      {renderTags(id, tags)}
    </TouchableOpacity>
  );
}

/**
 * カードヘッダー（日付とお気に入りボタン）を表示
 */
function renderCardHeader(
  date: string, 
  isFavorite: boolean, 
  showFavoriteButton: boolean, 
  onFavoritePress: (e: GestureResponderEvent) => void
) {
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.lessonDate}>{date}</Text>
      {showFavoriteButton && renderFavoriteButton(isFavorite, onFavoritePress)}
    </View>
  );
}

/**
 * お気に入りボタンを表示
 */
function renderFavoriteButton(
  isFavorite: boolean, 
  onPress: (e: GestureResponderEvent) => void
) {
  return (
    <TouchableOpacity 
      style={styles.favoriteButton} 
      onPress={onPress}
    >
      <MaterialIcons 
        name={isFavorite ? "favorite" : "favorite-border"} 
        size={24} 
        color={isFavorite ? COLORS.FAVORITE_ACTIVE : COLORS.FAVORITE_INACTIVE} 
      />
    </TouchableOpacity>
  );
}

/**
 * 教師名を表示
 */
function renderTeacherName(teacher: string) {
  return <Text style={styles.lessonTeacher}>{teacher}</Text>;
}

/**
 * 演奏曲情報を表示
 */
function renderPieceInfo(piece: string) {
  return <Text style={styles.lessonPiece}>{piece}</Text>;
}

/**
 * タグ一覧を表示
 */
function renderTags(lessonId: string, tags: string[]) {
  return (
    <View style={styles.tagContainer}>
      {tags && tags.map((tag, index) => (
        <View key={`${lessonId}-tag-${index}`} style={styles.lessonTag}>
          <Text style={styles.lessonTagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * スタイル定義
 */
const styles = StyleSheet.create({
  lessonCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
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
    color: COLORS.TEXT_TERTIARY,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  favoriteButton: {
    padding: 4,
  },
  lessonTeacher: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  lessonPiece: {
    fontSize: 17,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lessonTag: {
    backgroundColor: COLORS.TAG_BACKGROUND,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 4,
  },
  lessonTagText: {
    fontSize: 13,
    color: COLORS.TAG_TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
