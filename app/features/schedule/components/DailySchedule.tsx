import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, FlatList } from 'react-native';
import { Lesson } from '../../../../store/lessons';

const colors = {
  primary: '#4285F4',
  primaryLight: '#8AB4F8',
  secondary: '#34A853',
  error: '#EA4335',
  warning: '#FBBC05',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  divider: '#DADCE0',
};

interface DailyScheduleProps {
  lessons: Lesson[];
  onLessonPress: (lesson: Lesson) => void;
}

export const DailySchedule: React.FC<DailyScheduleProps> = ({ lessons, onLessonPress }) => {
  // 日付でソート
  const sortedLessons = [...lessons].sort((a, b) => {
    return a.date.localeCompare(b.date);
  });

  const renderLesson = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonItem}
      onPress={() => onLessonPress(item)}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.titleText}>{item.summary}</Text>
        {item.teacher && (
          <Text style={styles.teacherText}>講師: {item.teacher}</Text>
        )}
        {item.pieces && item.pieces.length > 0 && (
          <Text style={styles.piecesText}>
            曲目: {item.pieces.join(', ')}
          </Text>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.tagItem}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={sortedLessons}
      renderItem={renderLesson}
      keyExtractor={(item) => item.id}
      style={styles.container}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  teacherText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  piecesText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagItem: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default DailySchedule; 