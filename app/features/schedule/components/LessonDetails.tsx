import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Lesson } from '../../../store/lessons';

interface LessonDetailsProps {
  selectedDate: Date;
  lesson: Lesson | undefined;
}

export const LessonDetails: React.FC<LessonDetailsProps> = ({ selectedDate, lesson }) => {
  const formatDate = useCallback((date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }, []);

  const handleViewLesson = () => {
    if (lesson) {
      router.push({
        pathname: '/(lesson-detail)',
        params: { id: lesson.id },
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.selectedDateText}>{formatDate(selectedDate)}</Text>
      
      {lesson ? (
        <View style={styles.lessonDetails}>
          <View style={styles.lessonHeader}>
            <Text style={styles.lessonTitle}>レッスン情報</Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={handleViewLesson}>
              <Text style={styles.viewButtonText}>詳細を見る</Text>
              <MaterialIcons name="chevron-right" size={20} color="#1a73e8" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.lessonInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>講師:</Text>
              <Text style={styles.infoValue}>{lesson.teacher}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>曲名:</Text>
              <Text style={styles.infoValue}>
                {lesson.pieces && lesson.pieces.length > 0 
                  ? lesson.pieces.join(', ') 
                  : '未設定'}
              </Text>
            </View>
            {lesson.tags && lesson.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {lesson.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            {lesson.summary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>サマリー:</Text>
                <Text style={styles.summaryText} numberOfLines={3}>{lesson.summary}</Text>
              </View>
            )}
            {lesson.notes && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>メモ:</Text>
                <Text style={styles.summaryText} numberOfLines={3}>{lesson.notes}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noLessonContainer}>
          <MaterialIcons name="event-busy" size={48} color="#E5E5EA" />
          <Text style={styles.noLessonText}>この日のレッスンはありません</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  lessonDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 10,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  viewButtonText: {
    fontSize: 13,
    color: '#1a73e8',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  lessonInfo: {
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    width: 50,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  tagText: {
    fontSize: 11,
    color: '#5f6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryContainer: {
    marginTop: 6,
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  summaryText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  noLessonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  noLessonText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default LessonDetails;
