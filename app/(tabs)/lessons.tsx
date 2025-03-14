import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import ListHeader from '../features/lessons/components/list/ListHeader';
import LessonCard from '../features/lessons/components/list/LessonCard';
import { Lesson } from '../store/lessons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme/index';
import { StaggeredList } from '../components/AnimatedComponents';

export default function LessonsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ['リズム', 'テクニック', '表現', 'ペダル', '音色', '強弱'];
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();

  // マテリアルデザインの色を定義
  const colors = {
    primary: '#4285F4',
    primaryLight: '#8AB4F8',
    secondary: '#34A853',
    error: '#EA4335',
    warning: '#FBBC05',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    textPrimary: '#202124',
    textSecondary: '#5F6368',
    textTertiary: '#9AA0A6',
    divider: '#DADCE0',
  };

  // Firestoreからのリアルタイム更新を監視
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log('レッスン一覧: リアルタイム監視を開始します');
    
    const lessonsRef = collection(db, 'lessons');
    // user_idフィールドを使用したクエリを作成
    const userId = auth.currentUser.uid;
    const q = query(lessonsRef, where('user_id', '==', userId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lessonsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          teacher: data.teacher || data.teacherName || '',
          date: data.date || '',
          piece: data.piece || '',
          pieces: data.pieces || [],
          summary: data.summary || '',
          notes: data.notes || '',
          tags: data.tags || [],
          user_id: data.user_id || data.userId || '',
          audioUrl: data.audioUrl || data.audio_url || null,
          transcription: data.transcription || '',
          status: data.status || '',
          isFavorite: data.isFavorite || false,
          isDeleted: data.isDeleted || false,
          processingId: data.processingId || '',
          created_at: data.created_at || data.createdAt || new Date(),
          updated_at: data.updated_at || data.updatedAt || new Date(),
        };
      });
      
      // 削除されたレッスンをフィルタリング
      const filteredLessons = lessonsList.filter(lesson => !lesson.isDeleted);
      
      console.log(`レッスン一覧: ${filteredLessons.length}件のレッスンを更新しました`);
      setLessons(filteredLessons);
      setIsLoading(false);
    });
    
    return () => {
      console.log('レッスン一覧: リアルタイム監視を終了します');
      unsubscribe();
    };
  }, [auth.currentUser?.uid]);

  // 検索とフィルタリングの関数
  const filteredLessons = lessons.filter(lesson => {
    // 検索テキストでフィルタリング
    const searchMatch = searchText === '' || 
      lesson.teacher.toLowerCase().includes(searchText.toLowerCase()) ||
      (lesson.pieces && lesson.pieces.some(piece => piece.toLowerCase().includes(searchText.toLowerCase())));
    
    // タグでフィルタリング
    const tagMatch = selectedTags.length === 0 || 
      (lesson.tags && selectedTags.every(tag => lesson.tags.includes(tag)));
    
    return searchMatch && tagMatch;
  });

  // 検索テキスト変更ハンドラ
  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  // タグ選択ハンドラ
  const handleTagPress = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ListHeader 
        searchText={searchText}
        onSearchChange={handleSearchChange}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagPress={handleTagPress}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            レッスンを読み込み中...
          </Text>
        </View>
      ) : filteredLessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {searchText || selectedTags.length > 0 
              ? '検索条件に一致するレッスンがありません' 
              : 'レッスンがまだ登録されていません'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StaggeredList staggerDelay={50}>
            {filteredLessons.map((lesson) => (
              <Animated.View 
                key={lesson.id}
                entering={FadeIn.duration(300).delay(100)}
              >
                <LessonCard
                  id={lesson.id}
                  teacher={lesson.teacher}
                  date={new Date(lesson.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  pieces={lesson.pieces || []}
                  tags={lesson.tags || []}
                  isFavorite={lesson.isFavorite}
                />
              </Animated.View>
            ))}
          </StaggeredList>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});